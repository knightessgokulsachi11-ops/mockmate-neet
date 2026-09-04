/** Browser-only OCR helper (Tesseract). Used as the primary reader for scanned pages/images. */

type Worker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<Worker> | null = null;

async function createWorker() {
  const { createWorker } = await import("tesseract.js");
  return createWorker("eng");
}

async function getWorker() {
  if (!workerPromise) workerPromise = createWorker();
  return workerPromise;
}

/** Run OCR on a data-URL image and return the recognised plain text. */
export async function ocrImage(dataUrl: string): Promise<string> {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(dataUrl);
    return (data.text ?? "").trim();
  } catch {
    return "";
  }
}

export async function disposeOcr() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    /* ignore */
  }
  workerPromise = null;
}
