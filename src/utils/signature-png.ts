import { clamp } from './math';

export type SignatureInkColor = {
  r: number;
  g: number;
  b: number;
};

export type PreparedSignatureOptions = {
  sensitivity: string | number;
  trim: boolean;
  color?: SignatureInkColor;
  noSignatureMessage: string;
};

export type PreparedSignatureResult = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  keptPixels: number;
};

type SignatureComponent = {
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function loadImageElementFromFile(file: File, errorMessage: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(errorMessage));
    };
    image.src = url;
  });
}

export function percentileFromHistogram(histogram: number[], total: number, percentile: number) {
  const target = Math.max(1, Math.floor(total * percentile));
  let sum = 0;
  for (let i = 0; i < histogram.length; i++) {
    sum += histogram[i];
    if (sum >= target) return i;
  }
  return histogram.length - 1;
}

export function buildPreparedSignature(
  image: HTMLImageElement,
  options: PreparedSignatureOptions,
): PreparedSignatureResult {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth || image.width;
  sourceCanvas.height = image.naturalHeight || image.height;

  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('Canvas is not available');
  sourceContext.fillStyle = '#ffffff';
  sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const total = width * height;
  const sourceImageData = sourceContext.getImageData(0, 0, width, height);
  const source = sourceImageData.data;
  const histogram = new Array(256).fill(0);
  const luminance = new Uint8Array(total);

  for (let i = 0, pixel = 0; i < source.length; i += 4, pixel++) {
    const luma = Math.round(source[i] * 0.299 + source[i + 1] * 0.587 + source[i + 2] * 0.114);
    luminance[pixel] = luma;
    histogram[luma]++;
  }

  const paperLuma = percentileFromHistogram(histogram, total, 0.9);
  const sensitivity = Number(options.sensitivity) || 58;
  const minContrast = clamp(70 - sensitivity * 0.75, 12, 60);
  const fullContrast = minContrast + 48;
  const candidateAlpha = new Uint8Array(total);
  const candidateMask = new Uint8Array(total);

  for (let pixel = 0; pixel < total; pixel++) {
    const contrast = paperLuma - luminance[pixel];
    const strength = clamp((contrast - minContrast) / (fullContrast - minContrast), 0, 1);
    const alpha = Math.round(strength * 255);
    candidateAlpha[pixel] = alpha;
    candidateMask[pixel] = alpha > 10 ? 1 : 0;
  }

  const finalAlpha = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const edgeMargin = Math.max(4, Math.round(Math.min(width, height) * 0.01));
  const minComponentArea = Math.max(80, Math.round(total * 0.00001));
  const maxComponentArea = Math.round(total * 0.35);
  const keptComponents: SignatureComponent[] = [];
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let keptPixels = 0;

  for (let start = 0; start < total; start++) {
    if (!candidateMask[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    let touchesEdge = false;
    let area = 0;
    let componentMinX = width;
    let componentMinY = height;
    let componentMaxX = -1;
    let componentMaxY = -1;
    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const current = queue[head++];
      area++;

      const x = current % width;
      const y = (current - x) / width;
      if (x <= edgeMargin || y <= edgeMargin || x >= width - edgeMargin || y >= height - edgeMargin) {
        touchesEdge = true;
      }
      if (x < componentMinX) componentMinX = x;
      if (y < componentMinY) componentMinY = y;
      if (x > componentMaxX) componentMaxX = x;
      if (y > componentMaxY) componentMaxY = y;

      const left = current - 1;
      const right = current + 1;
      const up = current - width;
      const down = current + width;

      if (x > 0 && candidateMask[left] && !visited[left]) {
        visited[left] = 1;
        queue[tail++] = left;
      }
      if (x < width - 1 && candidateMask[right] && !visited[right]) {
        visited[right] = 1;
        queue[tail++] = right;
      }
      if (y > 0 && candidateMask[up] && !visited[up]) {
        visited[up] = 1;
        queue[tail++] = up;
      }
      if (y < height - 1 && candidateMask[down] && !visited[down]) {
        visited[down] = 1;
        queue[tail++] = down;
      }
    }

    const keepComponent = !touchesEdge && area >= minComponentArea && area <= maxComponentArea;
    if (!keepComponent) continue;

    keptComponents.push({
      area,
      minX: componentMinX,
      minY: componentMinY,
      maxX: componentMaxX,
      maxY: componentMaxY,
    });

    for (let j = 0; j < tail; j++) {
      const pixel = queue[j];
      const alpha = candidateAlpha[pixel];
      if (alpha <= 0) continue;

      finalAlpha[pixel] = alpha;
      keptPixels++;

      const x = pixel % width;
      const y = (pixel - x) / width;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (keptPixels === 0) {
    throw new Error(options.noSignatureMessage);
  }

  let cropMinX = minX;
  let cropMinY = minY;
  let cropMaxX = maxX;
  let cropMaxY = maxY;
  const largestComponentArea = keptComponents.reduce((largest, component) => {
    return Math.max(largest, component.area);
  }, 0);

  if (largestComponentArea > 0) {
    const anchorThreshold = Math.max(minComponentArea, largestComponentArea * 0.02);
    const anchorComponents = keptComponents.filter(component => component.area >= anchorThreshold);

    if (anchorComponents.length > 0) {
      let anchorMinX = width;
      let anchorMinY = height;
      let anchorMaxX = -1;
      let anchorMaxY = -1;

      anchorComponents.forEach(component => {
        if (component.minX < anchorMinX) anchorMinX = component.minX;
        if (component.minY < anchorMinY) anchorMinY = component.minY;
        if (component.maxX > anchorMaxX) anchorMaxX = component.maxX;
        if (component.maxY > anchorMaxY) anchorMaxY = component.maxY;
      });

      const neighborPadding = Math.max(32, Math.round(Math.max(width, height) * 0.04));
      const neighborMinArea = Math.max(minComponentArea, Math.round(largestComponentArea * 0.001));
      const selectedComponents = keptComponents.filter(component => {
        if (component.area >= anchorThreshold) return true;
        if (component.area < neighborMinArea) return false;

        return component.maxX >= anchorMinX - neighborPadding
          && component.minX <= anchorMaxX + neighborPadding
          && component.maxY >= anchorMinY - neighborPadding
          && component.minY <= anchorMaxY + neighborPadding;
      });

      cropMinX = width;
      cropMinY = height;
      cropMaxX = -1;
      cropMaxY = -1;

      selectedComponents.forEach(component => {
        if (component.minX < cropMinX) cropMinX = component.minX;
        if (component.minY < cropMinY) cropMinY = component.minY;
        if (component.maxX > cropMaxX) cropMaxX = component.maxX;
        if (component.maxY > cropMaxY) cropMaxY = component.maxY;
      });
    }
  }

  const padding = Math.max(18, Math.round(Math.max(width, height) * 0.015));
  const cropX = options.trim ? Math.max(0, cropMinX - padding) : 0;
  const cropY = options.trim ? Math.max(0, cropMinY - padding) : 0;
  const cropRight = options.trim ? Math.min(width - 1, cropMaxX + padding) : width - 1;
  const cropBottom = options.trim ? Math.min(height - 1, cropMaxY + padding) : height - 1;
  const outputWidth = cropRight - cropX + 1;
  const outputHeight = cropBottom - cropY + 1;
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;

  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) throw new Error('Canvas is not available');
  const outputImageData = outputContext.createImageData(outputWidth, outputHeight);
  const output = outputImageData.data;
  const inkColor = options.color || { r: 0, g: 0, b: 0 };

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const sourcePixel = (cropY + y) * width + cropX + x;
      const outputIndex = (y * outputWidth + x) * 4;
      output[outputIndex] = inkColor.r;
      output[outputIndex + 1] = inkColor.g;
      output[outputIndex + 2] = inkColor.b;
      output[outputIndex + 3] = finalAlpha[sourcePixel];
    }
  }

  outputContext.putImageData(outputImageData, 0, 0);
  return {
    canvas: outputCanvas,
    width: outputWidth,
    height: outputHeight,
    keptPixels,
  };
}

export function canvasToPngBlob(canvas: HTMLCanvasElement, errorMessage: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error(errorMessage));
    }, 'image/png');
  });
}
