import { describe, expect, it } from 'vitest';
import {
  getMarkerCanvasPosition,
  getMarkerPdfPositionFromCanvas,
  getSignatureCanvasDimensions,
  getSignaturePdfDimensions,
} from './signature-geometry';

describe('signature geometry utilities', () => {
  it('calculates PDF dimensions from marker size and aspect ratio', () => {
    expect(getSignaturePdfDimensions({ size: 120 }, 3)).toEqual({ width: 120, height: 40 });
    expect(getSignaturePdfDimensions({ size: 120 }, 0)).toEqual({ width: 120, height: 120 });
  });

  it('scales PDF signature dimensions into canvas dimensions', () => {
    expect(getSignatureCanvasDimensions(
      { size: 100 },
      { width: 500, height: 700 },
      { width: 1000, height: 1400 },
      2,
    )).toEqual({ width: 50, height: 25 });
  });

  it('converts clamped canvas points into PDF coordinates', () => {
    const position = getMarkerPdfPositionFromCanvas(
      { size: 200 },
      { x: 0, y: 800 },
      { width: 500, height: 700 },
      { width: 1000, height: 1400 },
      2,
    );

    expect(position).toEqual({
      canvasX: 50,
      canvasY: 675,
      x: 100,
      y: 50,
    });
  });

  it('converts PDF coordinates back into canvas coordinates', () => {
    expect(getMarkerCanvasPosition(
      { x: 100, y: 50 },
      { width: 500, height: 700 },
      { width: 1000, height: 1400 },
    )).toEqual({ x: 50, y: 675 });
  });

  it('falls back to stored canvas coordinates when metrics are missing', () => {
    expect(getMarkerCanvasPosition(
      { x: 100, y: 50, canvasX: 12, canvasY: 34 },
      { width: 0, height: 700 },
      { width: 1000, height: 1400 },
    )).toEqual({ x: 12, y: 34 });
  });
});
