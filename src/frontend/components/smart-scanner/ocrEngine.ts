import { createWorker } from "tesseract.js";
import { Capacitor } from "@capacitor/core";

export interface OcrBlock {
  text: string;
  confidence: number; // 0 to 100
  x: number;          // Left bound in pixels
  y: number;          // Top bound in pixels
  width: number;
  height: number;
}

export interface OcrResult {
  text: string;
  blocks: OcrBlock[];
  source: "Tesseract.js" | "Google ML Kit" | "Gemini AI";
  geminiResult?: any;
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
    // Restrict characters to avoid false positives (e.g. bracket lines recognized as digits)
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%°/ ",
    });
    tesseractWorker = worker;
    console.log("[OCR] Tesseract.js worker initialized successfully with whitelists.");
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
  // Option 0: Cloud Gemini AI Vision check (highest accuracy)
  try {
    const base64Data = canvas.toDataURL("image/jpeg", 0.85);
    const response = await fetch("/api/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Data }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.deviceType && result.confidence !== undefined) {
        console.log("[OCR] Received result from Gemini AI Vision:", result);
        return {
          text: `Gemini parsed: ${result.deviceType}`,
          blocks: [],
          source: "Gemini AI",
          geminiResult: result,
        };
      }
    }
  } catch (err) {
    console.warn("[OCR] Cloud Gemini AI analysis failed, falling back to local OCR:", err);
  }

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
      const blocks: OcrBlock[] = nativeResult.textDetections.map((d: any) => ({
        text: d.text,
        confidence: d.confidence || 80,
        x: d.boundingBox?.x || 0,
        y: d.boundingBox?.y || 0,
        width: d.boundingBox?.width || 0,
        height: d.boundingBox?.height || 0,
      }));

      return {
        text: texts,
        blocks,
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
  const blocks: OcrBlock[] = (data.words || []).map((word: any) => ({
    text: word.text,
    confidence: word.confidence || 0,
    x: word.bbox?.x0 || 0,
    y: word.bbox?.y0 || 0,
    width: (word.bbox?.x1 || 0) - (word.bbox?.x0 || 0),
    height: (word.bbox?.y1 || 0) - (word.bbox?.y0 || 0),
  }));

  return {
    text: data.text || "",
    blocks,
    source: "Tesseract.js",
  };
}
