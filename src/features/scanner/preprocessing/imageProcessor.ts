import { MeterProfile } from "../meterProfiles/onCallPlus";

// Convert canvas image to grayscale
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

// Adjust contrast (-255 to 255). Recommended for OCR: 80
export function adjustContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrast: number,
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128)); // R
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
  }
  ctx.putImageData(imgData, 0, 0);
}

// Sharpen using a high-pass laplacian convolution matrix
export function sharpen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const side = 3;
  const halfSide = 1;

  const output = ctx.createImageData(width, height);
  const dst = output.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sy = y;
      const sx = x;
      const dstOff = (y * width + x) * 4;

      let r = 0,
        g = 0,
        b = 0;
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

// Normalize brightness (min-max normalization / histogram stretching) to reduce glare and optimize thresholding
export function normalizeBrightness(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // assuming grayscale already
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }

  if (max === min) return; // avoid division by zero

  for (let i = 0; i < data.length; i += 4) {
    const val = ((data[i] - min) / (max - min)) * 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);
}

// Apply local adaptive thresholding (binarization) using integral image
export function adaptiveThreshold(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  boxSize = 19,
  C = 12,
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = data[i];
  }

  const output = ctx.createImageData(width, height);
  const dst = output.data;
  const halfBox = Math.floor(boxSize / 2);

  const integral = new Uint32Array(width * height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      sum += gray[idx];
      if (y === 0) {
        integral[idx] = sum;
      } else {
        integral[idx] = integral[idx - width] + sum;
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dstOff = idx * 4;

      const y0 = Math.max(0, y - halfBox);
      const y1 = Math.min(height - 1, y + halfBox);
      const x0 = Math.max(0, x - halfBox);
      const x1 = Math.min(width - 1, x + halfBox);

      const count = (y1 - y0 + 1) * (x1 - x0 + 1);

      const idx_br = y1 * width + x1;
      const idx_bl = y1 * width + (x0 - 1);
      const idx_tr = (y0 - 1) * width + x1;
      const idx_tl = (y0 - 1) * width + (x0 - 1);

      let sum = integral[idx_br];
      if (x0 > 0) sum -= integral[idx_bl];
      if (y0 > 0) sum -= integral[idx_tr];
      if (x0 > 0 && y0 > 0) sum += integral[idx_tl];

      const mean = sum / count;
      const val = gray[idx] < mean - C ? 0 : 255;

      dst[dstOff] = val;
      dst[dstOff + 1] = val;
      dst[dstOff + 2] = val;
      dst[dstOff + 3] = data[dstOff + 3];
    }
  }

  ctx.putImageData(output, 0, 0);
}

/**
 * Crops the LCD display guide box region from an input canvas,
 * and performs preprocessing to optimize text readability for OCR.
 */
export function cropAndPreprocess(
  inputCanvas: HTMLCanvasElement,
  profile: MeterProfile,
): HTMLCanvasElement {
  const cropCanvas = document.createElement("canvas");
  const { topRatio, leftRatio, widthRatio, heightRatio } = profile.screenCrop;

  const cropX = inputCanvas.width * leftRatio;
  const cropY = inputCanvas.height * topRatio;
  const cropW = inputCanvas.width * widthRatio;
  const cropH = inputCanvas.height * heightRatio;

  cropCanvas.width = Math.round(cropW);
  cropCanvas.height = Math.round(cropH);

  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) {
    throw new Error("Could not get 2d context for crop canvas");
  }

  // Draw only the cropped portion from the input canvas
  cropCtx.drawImage(
    inputCanvas,
    Math.round(cropX),
    Math.round(cropY),
    Math.round(cropW),
    Math.round(cropH),
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  );

  // Apply sequential image filters
  grayscale(cropCtx, cropCanvas.width, cropCanvas.height);
  normalizeBrightness(cropCtx, cropCanvas.width, cropCanvas.height);
  adjustContrast(cropCtx, cropCanvas.width, cropCanvas.height, 80);
  sharpen(cropCtx, cropCanvas.width, cropCanvas.height);
  adaptiveThreshold(cropCtx, cropCanvas.width, cropCanvas.height, 19, 12);

  return cropCanvas;
}
