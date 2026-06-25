import { createWorker } from "tesseract.js";
import { Capacitor } from "@capacitor/core";

export interface OcrResult {
  text: string;
  source: "Tesseract.js" | "Google ML Kit";
}

let tesseractWorker: any = null;
let isInitializing = false;

// Initialize Tesseract Worker
export async function initOcrEngine(): Promise<void> {
  if (tesseractWorker || isInitializing) return;
  isInitializing = true;
  try {
    // Create a worker for English language
    const worker = await createWorker("eng");
    tesseractWorker = worker;
    console.log("[OCR] Tesseract.js worker initialized successfully.");
  } catch (error) {
    console.error("[OCR] Failed to initialize Tesseract worker:", error);
  } finally {
    isInitializing = false;
  }
}

// Terminate Tesseract Worker to free up memory
export async function terminateOcrEngine(): Promise<void> {
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate();
      tesseractWorker = null;
      console.log("[OCR] Tesseract.js worker terminated.");
    } catch (e) {
      console.error("[OCR] Error terminating worker:", e);
    }
  }
}

/**
 * Perform OCR on a canvas element.
 * If native Capacitor platform, it could delegate to native plugins if configured,
 * otherwise runs Tesseract.js locally inside a Web Worker.
 */
export async function performOcr(canvas: HTMLCanvasElement): Promise<OcrResult> {
  // Option 1: Native Capacitor OCR (e.g. Google ML Kit / Apple Vision)
  if (Capacitor.isNativePlatform()) {
    try {
      // Lazy load Capacitor plugins to avoid importing them on Web platforms
      const { Ocr } = await import("@capacitor-community/image-to-text");
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      
      // Get base64 representation of canvas
      const base64Data = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "");
      const fileName = `ocr_temp_${Date.now()}.jpg`;
      
      // Write temp file to local disk (required for the detectText API)
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Run native OCR
      const nativeResult = await Ocr.detectText({
        filename: writeResult.uri,
      });

      // Clean up temp file asynchronously
      Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache,
      }).catch(err => console.warn("[OCR] Temp file deletion failed:", err));

      const texts = nativeResult.textDetections.map((d: any) => d.text).join("\n");
      return {
        text: texts,
        source: "Google ML Kit",
      };
    } catch (err) {
      console.warn("[OCR] Native OCR failed or plugins not installed, falling back to Tesseract.js:", err);
      // Fallback to Tesseract.js below
    }
  }

  // Option 2: Tesseract.js Web/Mobile Fallback
  if (!tesseractWorker) {
    await initOcrEngine();
  }

  if (!tesseractWorker) {
    throw new Error("OCR engine is not ready.");
  }

  // Run recognition on canvas
  const { data } = await tesseractWorker.recognize(canvas);
  return {
    text: data.text || "",
    source: "Tesseract.js",
  };
}
