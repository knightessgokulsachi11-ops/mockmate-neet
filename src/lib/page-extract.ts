/**
 * Browser-only page reader for bulk import.
 * Strategy per page:
 *  1. Text-based PDF page  -> direct text-layer extraction (no OCR, no AI).
 *  2. Scanned PDF page / image -> OCR (Tesseract).
 *  3. AI is used only later, when the extracted text cannot be parsed reliably.
 */
import { ocrImage } from "./ocr";

const MAX_EDGE = 1600;
const SCAN_EDGE = 2400;
/** Below this many characters a PDF page is treated as scanned (image-only). */
const TEXT_LAYER_MIN_CHARS = 180;

export interface PageUnit {
  file: string;
  page: number;
  text: string;
  source: "text" | "ocr";
  /** Rendered page image (data URL), used only when AI fallback is needed. */
  getImage: () => Promise<string>;
}

export interface LoadedFile {
  total: number;
  get: (index: number) => Promise<PageUnit>;
  close: () => void;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

async function downscaleImage(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  if (scale === 1 && dataUrl.length < 4_000_000) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function loadPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const buffer = await file.arrayBuffer();
  return pdfjs.getDocument({ data: buffer }).promise;
}

type PdfDoc = Awaited<ReturnType<typeof loadPdf>>;
type PdfPage = Awaited<ReturnType<PdfDoc["getPage"]>>;

async function pageText(page: PdfPage): Promise<string> {
  try {
    const content = await page.getTextContent();
    const lines = new Map<number, string[]>();
    for (const item of content.items) {
      const it = item as { str?: string; transform?: number[] };
      if (!it.str || !it.transform) continue;
      const y = Math.round(it.transform[5] ?? 0);
      const bucket = lines.get(y) ?? [];
      bucket.push(it.str);
      lines.set(y, bucket);
    }
    return [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(" ").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  } catch {
    return "";
  }
}

async function renderPage(page: PdfPage): Promise<string> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.max(1.2, Math.min(3, SCAN_EDGE / Math.max(base.width, base.height)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not render this page.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.9);
}

export async function loadFilePages(file: File): Promise<LoadedFile> {
  if (file.size > 200 * 1024 * 1024) throw new Error("File is too large (max 200 MB).");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    if (!file.type.startsWith("image/")) throw new Error("Upload a PDF or an image file.");
    let cached: string | null = null;
    const image = async () => (cached ??= await downscaleImage(await fileToDataUrl(file)));
    return {
      total: 1,
      close: () => {},
      get: async () => {
        const img = await image();
        return {
          file: file.name,
          page: 1,
          text: await ocrImage(img),
          source: "ocr" as const,
          getImage: image,
        };
      },
    };
  }

  const pdf = await loadPdf(file);
  return {
    total: pdf.numPages,
    close: () => {
      try {
        void (pdf as unknown as { cleanup?: () => void }).cleanup?.();
      } catch {
        /* ignore */
      }
    },
    get: async (index: number) => {
      const page = await pdf.getPage(index + 1);
      let rendered: string | null = null;
      const getImage = async () => (rendered ??= await renderPage(page));
      const text = await pageText(page);
      if (text.length >= TEXT_LAYER_MIN_CHARS) {
        return { file: file.name, page: index + 1, text, source: "text" as const, getImage };
      }
      // Scanned / image-only page: OCR it.
      const img = await getImage();
      const ocr = await ocrImage(img);
      return {
        file: file.name,
        page: index + 1,
        text: ocr.length > text.length ? ocr : text,
        source: "ocr" as const,
        getImage,
      };
    },
  };
}
