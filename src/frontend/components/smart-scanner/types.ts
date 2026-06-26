export interface OcrBlock {
  text: string;
  confidence: number; // 0 to 100
  x: number; // Left bound in pixels
  y: number; // Top bound in pixels
  width: number;
  height: number;
}

export interface OcrResult {
  text: string;
  blocks: OcrBlock[];
  source: "Tesseract.js" | "Google ML Kit" | "Gemini AI" | "Google Cloud Vision";
  geminiResult?: any;
}
