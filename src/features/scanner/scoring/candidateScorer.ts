import { GlucoseOcrBlock } from "../ocr/glucoseOCR";
import { MeterProfile } from "../meterProfiles/onCallPlus";
import { cleanAndParseNumber } from "../parser/glucoseParser";

export interface GlucoseCandidate {
  block: GlucoseOcrBlock;
  value: number | null;
  score: number;
  sizeScore: number;
  centerScore: number;
  rangeScore: number;
  penaltyScore: number;
}

/**
 * Evaluates and scores OCR candidates based on size, location, and pattern rules.
 * Equation:
 * score = ((sizeScore * 3) + (centerScore * 2) + (rangeScore * 2)) / (penaltyScore * 3)
 */
export function scoreCandidates(
  blocks: GlucoseOcrBlock[],
  cropWidth: number,
  cropHeight: number,
  profile: MeterProfile,
): GlucoseCandidate[] {
  return blocks.map((block) => {
    const textUpper = block.text.toUpperCase();
    const parsedVal = cleanAndParseNumber(block.text);

    // 1. Calculate sizeScore (0 - 100)
    // Ratio of block area to crop area, normalized to 100
    const blockArea = block.width * block.height;
    const cropArea = cropWidth * cropHeight;
    const sizeScore = Math.min(100, (blockArea / cropArea) * 1000); // scaled multiplier for visibility

    // 2. Calculate centerScore (0 - 100)
    // Distance from the block's center to the crop canvas center
    const cropCenterX = cropWidth / 2;
    const cropCenterY = cropHeight / 2;
    const dist = Math.sqrt(
      Math.pow(block.centerX - cropCenterX, 2) + Math.pow(block.centerY - cropCenterY, 2),
    );
    const maxDist = Math.sqrt(Math.pow(cropCenterX, 2) + Math.pow(cropCenterY, 2));
    const centerScore = Math.max(0, (1.0 - dist / maxDist) * 100);

    // 3. Calculate rangeScore (0 or 100)
    // Values within the profile's min-max bounds (On Call Plus: 20 - 700)
    let rangeScore = 0;
    if (
      parsedVal !== null &&
      parsedVal >= profile.reading.min &&
      parsedVal <= profile.reading.max
    ) {
      rangeScore = 100;
    }

    // 4. Calculate penaltyScore (starts at 1.0)
    let penaltyScore = 1.0;

    // A. Ignore patterns matching
    for (const pattern of profile.ignorePatterns) {
      if (textUpper.includes(pattern.toUpperCase())) {
        penaltyScore += 2.0;
      }
    }

    // B. Non-digit character penalty
    // A valid glucose reading on On Call Plus is purely digital.
    // If it has letters, slashes, colons, etc. inside this word block, penalize it.
    const nonDigitCount = block.text.replace(/[\d]/g, "").length;
    if (nonDigitCount > 0) {
      penaltyScore += nonDigitCount * 1.5;
    }

    // C. Word length check (glucose readings are between 20-700, so length should be 2 or 3)
    const digitsOnly = block.text.replace(/[^\d]/g, "");
    if (digitsOnly.length < 2 || digitsOnly.length > 3) {
      penaltyScore += 2.5;
    }

    // D. Low OCR confidence penalty
    if (block.confidence < 60) {
      penaltyScore += 1.5;
    }

    // 5. Compute total score
    const num = sizeScore * 3 + centerScore * 2 + rangeScore * 2;
    const den = penaltyScore * 3;
    const score = num / den;

    return {
      block,
      value: parsedVal,
      score,
      sizeScore,
      centerScore,
      rangeScore,
      penaltyScore,
    };
  });
}
