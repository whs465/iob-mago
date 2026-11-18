import { describe, expect, it } from 'vitest';
import {
  clampScanCropPoint,
  FULL_SCAN_CROP,
  getScanCropOutputSize,
  warpScanCrop,
} from './scan-crop';

describe('scan crop', () => {
  it('estimates the corrected document size and respects the maximum edge', () => {
    expect(getScanCropOutputSize(3000, 2000, FULL_SCAN_CROP)).toEqual({ width: 2400, height: 1600 });
  });

  it('keeps crop handles inside the source image', () => {
    expect(clampScanCropPoint({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
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
