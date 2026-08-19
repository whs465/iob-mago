import { describe, expect, it } from 'vitest';
import { getPdfTextDrawPosition } from './pdf-text-position';

describe('getPdfTextDrawPosition', () => {
  it('keeps the clicked x coordinate even when the text extends past the right edge', () => {
    expect(getPdfTextDrawPosition(
      { x: 280, y: 200 },
      { width: 300, height: 400 },
      14,
    )).toEqual({ x: 280, y: 186 });
  });

  it('keeps the clicked top edge exact near the bottom instead of shifting text upward', () => {
    expect(getPdfTextDrawPosition(
      { x: -10, y: 5 },
      { width: 300, height: 400 },
      14,
    )).toEqual({ x: 0, y: -9 });
  });
});
