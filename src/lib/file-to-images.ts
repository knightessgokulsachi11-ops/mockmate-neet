/** Browser-only helpers: turn an uploaded image or PDF into data-URL page images. */

const MAX_EDGE = 1600;
const SCAN_EDGE = 2400;

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

async function pdfToImages(file: File, maxPages = Number.POSITIVE_INFINITY): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const count = Math.min(pdf.numPages, maxPages);
  let failures = 0;
  for (let i = 1; i <= count; i++) {
    try {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      // Scanned pages need a higher render scale for the OCR to be reliable.
      const scale = Math.max(1.2, Math.min(3, SCAN_EDGE / Math.max(base.width, base.height)));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        failures++;
        continue;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      pages.push(canvas.toDataURL("image/jpeg", 0.9));
      page.cleanup();
    } catch {
      failures++;
    }
  }
  if (pages.length === 0) {
    throw new Error(
      failures > 0
        ? "Could not render that PDF (it may be encrypted or corrupted)."
        : "That PDF has no pages.",
    );
  }
  return pages;
}

export async function fileToPageImages(file: File): Promise<string[]> {
  if (file.size > 20 * 1024 * 1024) throw new Error("File is too large (max 20 MB).");
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return pdfToImages(file);
  }
  if (!file.type.startsWith("image/")) throw new Error("Upload a PDF or an image file.");
  return [await downscaleImage(await fileToDataUrl(file))];
}

/** Render every page of a PDF (or a single image) for bulk paper import. */
export async function fileToAllPageImages(
  file: File,
  maxPages = Number.POSITIVE_INFINITY,
): Promise<string[]> {
  if (file.size > 200 * 1024 * 1024) throw new Error("File is too large (max 200 MB).");
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return pdfToImages(file, maxPages);
  }
  if (!file.type.startsWith("image/")) throw new Error("Upload a PDF or an image file.");
  return [await downscaleImage(await fileToDataUrl(file))];
}

