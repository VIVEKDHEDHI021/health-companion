/**
 * High performance canvas image filters to preprocess device screen captures
 * before feeding them to the OCR engine.
 */

// Convert image to grayscale
export function grayscale(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imgData, 0, 0);
}

// Adjust contrast (-255 to 255). Recommended: 60 - 100
export function adjustContrast(ctx: CanvasRenderingContext2D, width: number, height: number, contrast: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128; // R
    data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
    data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
  }
  ctx.putImageData(imgData, 0, 0);
}

// Apply simple thresholding (binarization) to isolate LCD segments/black text
export function threshold(ctx: CanvasRenderingContext2D, width: number, height: number, limit = 128) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Since it's already grayscale, R=G=B. We check R value.
    const val = data[i] >= limit ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);
}

// Sharpen using a convolution matrix
export function sharpen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const weights = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  
  const output = ctx.createImageData(width, height);
  const dst = output.data;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sy = y;
      const sx = x;
      const dstOff = (y * width + x) * 4;
      
      // Calculate convolution
      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, sy + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, sx + cx - halfSide));
          const srcOff = (scy * width + scx) * 4;
          const wt = weights[cy * side + cx];
          r += data[srcOff] * wt;
          g += data[srcOff + 1] * wt;
          b += data[srcOff + 2] * wt;
        }
      }
      
      dst[dstOff] = Math.min(255, Math.max(0, r));
      dst[dstOff + 1] = Math.min(255, Math.max(0, g));
      dst[dstOff + 2] = Math.min(255, Math.max(0, b));
      dst[dstOff + 3] = data[dstOff + 3]; // Keep alpha
    }
  }
  ctx.putImageData(output, 0, 0);
}

/**
 * Combines filters to optimize the image for Tesseract OCR.
 * Steps:
 * 1. Grayscale conversion.
 * 2. Increase contrast to make numbers stand out.
 * 3. Sharpen edges.
 * 4. Binarization thresholding (keeps text black/white for clear segment distinction).
 */
export function preprocessCanvasForOcr(canvas: HTMLCanvasElement, thresholdLimit = 120) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  
  grayscale(ctx, width, height);
  adjustContrast(ctx, width, height, 75);
  sharpen(ctx, width, height);
  threshold(ctx, width, height, thresholdLimit);
}
