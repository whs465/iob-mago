// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { canvasToPngBlob, percentileFromHistogram } from './signature-png';

describe('signature PNG utilities', () => {
  it('calculates a percentile from a histogram', () => {
    const histogram = [0, 2, 3, 5];

    expect(percentileFromHistogram(histogram, 10, 0.1)).toBe(1);
    expect(percentileFromHistogram(histogram, 10, 0.5)).toBe(2);
    expect(percentileFromHistogram(histogram, 10, 0.9)).toBe(3);
  });

  it('converts a canvas to a PNG blob', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    const canvas = document.createElement('canvas');
    canvas.toBlob = vi.fn(callback => callback(blob)) as unknown as HTMLCanvasElement['toBlob'];

    await expect(canvasToPngBlob(canvas, 'No PNG')).resolves.toBe(blob);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  it('rejects when canvas PNG creation fails', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = vi.fn(callback => callback(null)) as unknown as HTMLCanvasElement['toBlob'];

    await expect(canvasToPngBlob(canvas, 'No PNG')).rejects.toThrow('No PNG');
  });
});
