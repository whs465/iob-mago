import { describe, expect, it, vi } from 'vitest';
import { recolorCanvasPixels } from './signature-recolor';

describe('recolorCanvasPixels', () => {
  it('replaces RGB channels and preserves alpha', () => {
    const imageData = {
      data: new Uint8ClampedArray([
        1, 2, 3, 128,
        4, 5, 6, 255,
      ]),
    } as ImageData;
    const context = {
      getImageData: vi.fn(() => imageData),
      putImageData: vi.fn(),
    };
    const canvas = {
      width: 2,
      height: 1,
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement;

    recolorCanvasPixels(canvas, { r: 17, g: 24, b: 39 });

    expect(context.getImageData).toHaveBeenCalledWith(0, 0, 2, 1);
    expect([...imageData.data]).toEqual([
      17, 24, 39, 128,
      17, 24, 39, 255,
    ]);
    expect(context.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
  });

  it('throws when the canvas has no 2D context', () => {
    const canvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    expect(() => recolorCanvasPixels(canvas, { r: 0, g: 0, b: 0 })).toThrow(
      'Canvas 2D context unavailable',
    );
  });
});
