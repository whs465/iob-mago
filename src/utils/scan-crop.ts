export type ScanCropPoint = { x: number; y: number };
export type ScanCrop = [ScanCropPoint, ScanCropPoint, ScanCropPoint, ScanCropPoint];

export const FULL_SCAN_CROP: ScanCrop = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

export const EDITOR_SCAN_CROP: ScanCrop = [
  { x: 0.025, y: 0.025 },
  { x: 0.975, y: 0.025 },
  { x: 0.975, y: 0.975 },
  { x: 0.025, y: 0.975 },
];

export function cloneScanCrop(crop: ScanCrop): ScanCrop {
  return crop.map(point => ({ ...point })) as ScanCrop;
}

export function rotateScanCropClockwise([topLeft, topRight, bottomRight, bottomLeft]: ScanCrop): ScanCrop {
  const rotate = ({ x, y }: ScanCropPoint) => ({ x: 1 - y, y: x });
  return [rotate(bottomLeft), rotate(topLeft), rotate(topRight), rotate(bottomRight)];
}

export function clampScanCropPoint(point: ScanCropPoint): ScanCropPoint {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

function distance(a: ScanCropPoint, b: ScanCropPoint, width: number, height: number) {
  return Math.hypot((b.x - a.x) * width, (b.y - a.y) * height);
}

export function getScanCropOutputSize(
  sourceWidth: number,
  sourceHeight: number,
  crop: ScanCrop,
  maxEdge = 2400,
) {
  const estimatedWidth = Math.max(1, (distance(crop[0], crop[1], sourceWidth, sourceHeight)
    + distance(crop[3], crop[2], sourceWidth, sourceHeight)) / 2);
  const estimatedHeight = Math.max(1, (distance(crop[0], crop[3], sourceWidth, sourceHeight)
    + distance(crop[1], crop[2], sourceWidth, sourceHeight)) / 2);
  const scale = Math.min(1, maxEdge / Math.max(estimatedWidth, estimatedHeight));
  return {
    width: Math.max(1, Math.round(estimatedWidth * scale)),
    height: Math.max(1, Math.round(estimatedHeight * scale)),
  };
}

function mix(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

export function warpScanCrop(
  source: Pick<ImageData, 'data' | 'width' | 'height'>,
  crop: ScanCrop,
  outputWidth: number,
  outputHeight: number,
) {
  const width = Math.max(1, Math.round(outputWidth));
  const height = Math.max(1, Math.round(outputHeight));
  const output = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const sourceMaxX = Math.max(0, source.width - 1);
  const sourceMaxY = Math.max(0, source.height - 1);

  for (let y = 0; y < height; y += 1) {
    const v = height === 1 ? 0 : y / (height - 1);
    const leftX = mix(crop[0].x, crop[3].x, v);
    const leftY = mix(crop[0].y, crop[3].y, v);
    const rightX = mix(crop[1].x, crop[2].x, v);
    const rightY = mix(crop[1].y, crop[2].y, v);

    for (let x = 0; x < width; x += 1) {
      const u = width === 1 ? 0 : x / (width - 1);
      const sourceX = Math.min(sourceMaxX, Math.max(0, Math.round(mix(leftX, rightX, u) * sourceMaxX)));
      const sourceY = Math.min(sourceMaxY, Math.max(0, Math.round(mix(leftY, rightY, u) * sourceMaxY)));
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const outputOffset = (y * width + x) * 4;
      output.data[outputOffset] = source.data[sourceOffset];
      output.data[outputOffset + 1] = source.data[sourceOffset + 1];
      output.data[outputOffset + 2] = source.data[sourceOffset + 2];
      output.data[outputOffset + 3] = source.data[sourceOffset + 3];
    }
  }
  return output;
}
