import { describe, expect, it } from 'vitest';
import {
  clampScanCropPoint,
  FULL_SCAN_CROP,
  getScanCropOutputSize,
  rotateScanCropClockwise,
  warpScanCrop,
} from './scan-crop';

describe('scan crop', () => {
  it('estimates the corrected document size and respects the maximum edge', () => {
    expect(getScanCropOutputSize(3000, 2000, FULL_SCAN_CROP)).toEqual({ width: 2400, height: 1600 });
  });

  it('keeps crop handles inside the source image', () => {
    expect(clampScanCropPoint({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
  });

  it('rotates the selected region and swaps its output dimensions', () => {
    const rotated = rotateScanCropClockwise([
      { x: 0.125, y: 0.25 }, { x: 0.625, y: 0.25 },
      { x: 0.625, y: 0.875 }, { x: 0.125, y: 0.875 },
    ]);
    expect(rotated).toEqual([
      { x: 0.125, y: 0.125 }, { x: 0.75, y: 0.125 },
      { x: 0.75, y: 0.625 }, { x: 0.125, y: 0.625 },
    ]);
    expect(getScanCropOutputSize(1200, 800, rotated)).toEqual({ width: 750, height: 400 });
  });

  it('warps the selected quadrilateral into a rectangular image', () => {
    const source = {
      data: new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255,
        0, 0, 255, 255, 255, 255, 255, 255,
      ]),
      width: 2,
      height: 2,
    };
    const result = warpScanCrop(source, FULL_SCAN_CROP, 2, 2);
    expect(Array.from(result.data)).toEqual(Array.from(source.data));
  });
});
