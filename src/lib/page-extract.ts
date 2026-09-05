/**
 * Browser-only page reader for bulk import.
 * Strategy per page (no AI at any point):
 *  1. Text-based PDF page  -> direct text-layer extraction.
 *  2. Scanned PDF page / image -> OCR (Tesseract).
 * A single PDF may mix both kinds; each page is decided independently.
 */
import { ocrImage } from "./ocr";

const MAX_EDGE = 1600;
const SCAN_EDGE = 2400;
/** Below this many characters a PDF page is treated as scanned (image-only). */
const TEXT_LAYER_MIN_CHARS = 180;

export interface TextLine {
  /** Vertical position as a fraction of the page height (0 = top). */
  y: number;
  text: string;
}

export interface PageUnit {
  file: string;
  page: number;
  text: string;
  source: "text" | "ocr";
  /** Line positions (text pages only) — used to crop a question's visual. */
  lines: TextLine[];
  /** Rendered page image (data URL). */
  getImage: () => Promise<string>;
  /** Crop of the rendered page between two height fractions. */
  cropImage: (top: number, bottom: number) => Promise<string>;
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

/** Crop a data-URL image vertically (fractions of its height). */
export async function cropDataUrl(
  dataUrl: string,
  top: number,
  bottom: number,
  maxWidth = 900,
): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const t = Math.max(0, Math.min(1, top));
  const b = Math.max(t + 0.02, Math.min(1, bottom));
  const sy = Math.floor(img.height * t);
  const sh = Math.max(24, Math.ceil(img.height * (b - t)));
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, sy, img.width, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
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

async function pageLines(page: PdfPage): Promise<TextLine[]> {
  try {
    const content = await page.getTextContent();
    const height = page.getViewport({ scale: 1 }).height || 1;
    const buckets = new Map<number, string[]>();
    for (const item of content.items) {
      const it = item as { str?: string; transform?: number[] };
      if (!it.str || !it.transform) continue;
      const y = Math.round(it.transform[5] ?? 0);
      const bucket = buckets.get(y) ?? [];
      bucket.push(it.str);
      buckets.set(y, bucket);
    }
    return [...buckets.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, parts]) => ({
        y: Math.max(0, Math.min(1, 1 - y / height)),
        text: parts.join(" ").replace(/\s+/g, " ").trim(),
      }))
      .filter((l) => l.text.length > 0);
  } catch {
    return [];
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
  if (file.size > 500 * 1024 * 1024) throw new Error("File is too large (max 500 MB).");
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
          lines: [],
          getImage: image,
          cropImage: async (top: number, bottom: number) =>
            cropDataUrl(await image(), top, bottom),
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
      const cropImage = async (top: number, bottom: number) =>
        cropDataUrl(await getImage(), top, bottom);

      const lines = await pageLines(page);
      const text = lines.map((l) => l.text).join("\n").trim();
      if (text.length >= TEXT_LAYER_MIN_CHARS) {
        return {
          file: file.name,
          page: index + 1,
          text,
          source: "text" as const,
          lines,
          getImage,
          cropImage,
        };
      }
      // Scanned / image-only page: OCR it.
      const img = await getImage();
      const ocr = await ocrImage(img);
      return {
        file: file.name,
        page: index + 1,
        text: ocr.length > text.length ? ocr : text,
        source: "ocr" as const,
        lines: [],
        getImage,
        cropImage,
      };
    },
  };
}
