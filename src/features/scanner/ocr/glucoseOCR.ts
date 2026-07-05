import { createWorker } from "tesseract.js";

export interface GlucoseOcrBlock {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  centerX: number;
  centerY: number;
}

let glucoseWorker: any = null;
let isInitializing = false;

/**
 * Initializes the Tesseract.js worker with parameters optimized for LCD digits
 * and ignore patterns (whitelist includes common symbols to allow proper penalty classification).
 */
export async function initGlucoseOcr(): Promise<void> {
  console.log("[Glucose OCR] Disabled to reduce load.");
  return;
}

/**
 * Terminates the OCR worker to free system memory.
 */
export async function terminateGlucoseOcr(): Promise<void> {
  if (glucoseWorker) {
    try {
      await glucoseWorker.terminate();
      glucoseWorker = null;
      console.log("[Glucose OCR] Tesseract worker terminated.");
    } catch (e) {
      console.error("[Glucose OCR] Error terminating Tesseract worker:", e);
    }
  }
}

/**
 * Performs Tesseract OCR on a preprocessed cropped canvas
 * and returns blocks with geometry metrics.
 */
export async function performGlucoseOcr(canvas: HTMLCanvasElement): Promise<GlucoseOcrBlock[]> {
  if (!glucoseWorker) {
    await initGlucoseOcr();
  }
  if (!glucoseWorker) {
    throw new Error("Glucose OCR engine is not ready.");
  }

  const { data } = await glucoseWorker.recognize(canvas);

  const blocks: GlucoseOcrBlock[] = (data.words || []).map((word: any) => {
    const x = word.bbox?.x0 || 0;
    const y = word.bbox?.y0 || 0;
    const w = (word.bbox?.x1 || 0) - x;
    const h = (word.bbox?.y1 || 0) - y;
    return {
      text: word.text || "",
      confidence: word.confidence || 0,
      x,
      y,
      width: w,
      height: h,
      area: w * h,
      centerX: x + w / 2,
      centerY: y + h / 2,
    };
  });

  return blocks;
}
