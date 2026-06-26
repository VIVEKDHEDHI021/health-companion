/**
/**
 * Normalizes text from OCR, correcting common digital 7-segment display misreadings
 * and returning the parsed integer value.
 */
export function cleanAndParseNumber(text: string): number | null {
  const normalized = text
    .toUpperCase()
    .trim()
    // Correct common OCR mistakes for 7-segment numbers
    .replace(/O/g, "0")
    .replace(/[IL|]/g, "1")
    .replace(/S/g, "5")
    .replace(/Z/g, "2")
    .replace(/B/g, "8")
    .replace(/G/g, "6")
    .replace(/T/g, "7");

  // Keep only digits
  const digitOnly = normalized.replace(/[^\d]/g, "");

  if (!digitOnly) {
    return null;
  }

  const parsed = parseInt(digitOnly, 10);
  return isNaN(parsed) ? null : parsed;
}
