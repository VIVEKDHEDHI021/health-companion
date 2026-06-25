import { useEffect, useState } from "react";
import { MeterProfile, onCallPlusProfile } from "../meterProfiles/onCallPlus";
import { cropAndPreprocess } from "../preprocessing/imageProcessor";
import { performGlucoseOcr, initGlucoseOcr, terminateGlucoseOcr } from "../ocr/glucoseOCR";
import { scoreCandidates } from "../scoring/candidateScorer";
import { selectBestCandidate } from "../validation/glucoseValidator";

export interface ScanResult {
  success: boolean;
  value?: number;
  unit?: string;
  confidence?: number;
  message?: string;
  debugCropCanvas?: HTMLCanvasElement;
}

/**
 * Reusable hook to run the profile-based offline glucose scanner pipeline.
 * Manages OCR engine initialization and exposes a `scanFrame` method.
 */
export function useGlucoseScanner(profile: MeterProfile = onCallPlusProfile) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function init() {
      setIsInitializing(true);
      try {
        await initGlucoseOcr();
        if (active) {
          setIsReady(true);
        }
      } catch (err) {
        console.error("Failed to initialize glucose scanner:", err);
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    }
    init();

    return () => {
      active = false;
      terminateGlucoseOcr();
    };
  }, []);

  const scanFrame = async (inputCanvas: HTMLCanvasElement): Promise<ScanResult> => {
    if (!isReady) {
      return { success: false, message: "Scanner engine not ready." };
    }

    try {
      // 1. Crop LCD & Preprocess the image
      const croppedCanvas = cropAndPreprocess(inputCanvas, profile);
      const cropW = croppedCanvas.width;
      const cropH = croppedCanvas.height;

      // 2. Run OCR only on the cropped screen
      const blocks = await performGlucoseOcr(croppedCanvas);

      if (blocks.length === 0) {
        return {
          success: false,
          message: "No text blocks detected on screen.",
          debugCropCanvas: croppedCanvas,
        };
      }

      // 3. Score Candidates based on formula
      const candidates = scoreCandidates(blocks, cropW, cropH, profile);

      // 4. Select the highest scoring valid candidate
      const best = selectBestCandidate(candidates, profile);

      if (!best || best.value === null) {
        return {
          success: false,
          message: "Searching for glucose digits...",
          debugCropCanvas: croppedCanvas,
        };
      }

      return {
        success: true,
        value: best.value,
        unit: profile.reading.unit,
        confidence: best.block.confidence / 100,
        debugCropCanvas: croppedCanvas,
      };
    } catch (err: any) {
      console.error("Error during offline frame scan:", err);
      return { success: false, message: err.message || "Scan failed." };
    }
  };

  return {
    isReady,
    isInitializing,
    scanFrame,
  };
}
