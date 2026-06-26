import { GlucoseCandidate } from "../scoring/candidateScorer";
import { MeterProfile } from "../meterProfiles/onCallPlus";

/**
 * Validates a parsed glucose value against the profile constraints (20 - 700 mg/dL).
 */
export function isValidGlucoseValue(value: number, profile: MeterProfile): boolean {
  return value >= profile.reading.min && value <= profile.reading.max;
}

/**
 * Iterates through candidates, filters for valid ranges,
 * and returns the best candidate based on highest score.
 */
export function selectBestCandidate(
  candidates: GlucoseCandidate[],
  profile: MeterProfile,
): GlucoseCandidate | null {
  // Filter for candidates that are valid numbers in range
  const validCandidates = candidates.filter(
    (cand) => cand.value !== null && isValidGlucoseValue(cand.value, profile),
  );

  if (validCandidates.length === 0) {
    return null;
  }

  // Sort by score descending (highest score is largest, most centered, least penalized)
  validCandidates.sort((a, b) => b.score - a.score);

  const bestCandidate = validCandidates[0];

  // Minimum score threshold to prevent matching random digits in background noise
  // A typical reading with good size and center proximity scores above 20.
  if (bestCandidate.score < 10) {
    return null;
  }

  return bestCandidate;
}
