import { createWorker } from "tesseract.js";
import { Capacitor } from "@capacitor/core";
import { preprocessCanvasForOcr } from "./imageFilters";
import { OcrBlock, OcrResult } from "./types";


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
  // Option 0.1: Direct Google Cloud Vision API call from client (highest accuracy OCR)
  try {
    const clientVisionApiKey = 
      (typeof window !== "undefined" ? localStorage.getItem("user_vision_api_key") : null) || 
      import.meta.env.VITE_GOOGLE_CLOUD_VISION_API_KEY ||
      import.meta.env.VITE_GOOGLE_VISION_API_KEY;
    if (clientVisionApiKey) {
      const base64Data = canvas.toDataURL("image/jpeg", 0.85).replace(/^data:image\/\w+;base64,/, "");
      console.log("[OCR] Calling Google Cloud Vision API directly from client...");
      
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${clientVisionApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Data,
                },
                features: [
                  {
                    type: "DOCUMENT_TEXT_DETECTION",
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const resJson = await response.json();
        const annotations = resJson.responses?.[0]?.textAnnotations || [];
        const fullText = annotations[0]?.description || "";
        
        const blocks: OcrBlock[] = annotations.slice(1).map((ann: any) => {
          const vertices = ann.boundingPoly?.vertices || [];
          const x = vertices[0]?.x ?? 0;
          const y = vertices[0]?.y ?? 0;
          const x1 = vertices[1]?.x ?? x;
          const y2 = vertices[2]?.y ?? y;
          return {
            text: ann.description || "",
            confidence: 90,
            x,
            y,
            width: Math.max(0, x1 - x),
            height: Math.max(0, y2 - y),
          };
        });

        console.log("[OCR] Received direct client-side result from Google Cloud Vision");
        return {
          text: fullText,
          blocks,
          source: "Google Cloud Vision",
        };
      } else {
        const errText = await response.text();
        console.warn("[OCR] Direct Google Cloud Vision API response not OK:", errText);
      }
    }
  } catch (err: any) {
    console.warn("[OCR] Direct client Google Cloud Vision call failed, trying next option:", err);
  }

  // Option 0: Direct Gemini AI Vision call from client (highest accuracy, works on both Web and Mobile Capacitor via VITE_GEMINI_API_KEY or Local Settings)
  try {
    const clientApiKey = (typeof window !== "undefined" ? localStorage.getItem("user_gemini_api_key") : null) || import.meta.env.VITE_GEMINI_API_KEY;
    if (clientApiKey) {
      const base64Data = canvas.toDataURL("image/jpeg", 0.85).replace(/^data:image\/\w+;base64,/, "");
      console.log("[OCR] Calling Gemini Vision API directly from client...");
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${clientApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Identify the medical device in this image and extract its screen reading values. You must return a single JSON object matching this schema exactly: { \"deviceType\": \"Blood Glucose Meter\" | \"Blood Pressure Monitor\" | \"Pulse Oximeter\" | \"Thermometer\" | \"Weight Scale\", \"data\": { \"glucose\"?: number, \"systolic\"?: number, \"diastolic\"?: number, \"pulse\"?: number, \"spo2\"?: number, \"temperature\"?: number, \"weight\"?: number, \"unit\"?: string }, \"confidence\": number }. The confidence should reflect your detection certainty between 0.0 and 1.0. Do not include markdown codeblocks, comments, or backticks; output only raw JSON.",
                  },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          }),
        }
      );

      if (response.ok) {
        const resJson = await response.json();
        const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const result = JSON.parse(responseText.trim());

        if (result && result.deviceType && result.confidence !== undefined) {
          console.log("[OCR] Received direct client-side result from Gemini AI Vision:", result);
          return {
            text: `Gemini parsed: ${result.deviceType}`,
            blocks: [],
            source: "Gemini AI",
            geminiResult: result,
          };
        }
      } else {
        const errText = await response.text();
        console.warn("[OCR] Direct Gemini API response not OK:", errText);
        let errorMsg = "Gemini API Error";
        try {
          const parsedErr = JSON.parse(errText);
          errorMsg = parsedErr.error?.message || errorMsg;
        } catch (_) {}
        return {
          text: "",
          blocks: [],
          source: "Gemini AI",
          geminiResult: {
            deviceType: "Blood Glucose Meter",
            confidence: 0.0,
            data: {},
            error: errorMsg
          }
        };
      }
    }
  } catch (err: any) {
    console.warn("[OCR] Direct client Gemini call failed, trying relative server endpoint:", err);
  }

  // Option 0.5: Cloud Gemini AI Vision check (server-side proxy fallback for web environment)
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
        console.log("[OCR] Received result from server-side Gemini proxy:", result);
        return {
          text: `Gemini parsed: ${result.deviceType}`,
          blocks: [],
          source: "Gemini AI",
          geminiResult: result,
        };
      }
    }
  } catch (err) {
    console.warn("[OCR] Cloud Gemini AI analysis proxy failed, falling back to local OCR:", err);
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
  // Create a copy of canvas and run binarization filter on it for better local OCR results
  const filterCanvas = document.createElement("canvas");
  filterCanvas.width = canvas.width;
  filterCanvas.height = canvas.height;
  const fCtx = filterCanvas.getContext("2d");
  if (fCtx) {
    fCtx.drawImage(canvas, 0, 0);
    preprocessCanvasForOcr(filterCanvas);
  }

  if (!tesseractWorker) {
    await initOcrEngine();
  }

  if (!tesseractWorker) {
    throw new Error("OCR engine is not ready.");
  }

  // Run recognition on binarized filterCanvas
  const { data } = await tesseractWorker.recognize(filterCanvas);
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
