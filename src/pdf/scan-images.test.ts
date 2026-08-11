import { describe, expect, it, vi } from 'vitest';
import { getScanPageLayout, scannedImagesToPdf } from './scan-images';

describe('scan images to PDF', () => {
  it('uses landscape paper automatically and keeps the image inside the margin', () => {
    const layout = getScanPageLayout(1600, 900, { format: 'a4', margin: 24 });
    expect(layout.pageWidth).toBeCloseTo(841.89);
    expect(layout.pageHeight).toBeCloseTo(595.28);
    expect(layout.x).toBeGreaterThanOrEqual(24);
    expect(layout.y).toBeGreaterThanOrEqual(24);
  });

  it('creates one PDF page per image in the supplied order', async () => {
    const drawImage = vi.fn();
    const addPage = vi.fn(() => ({ drawImage }));
    const pdf = {
      embedPng: vi.fn(async () => ({ width: 800, height: 1200 })),
      embedJpg: vi.fn(async () => ({ width: 1200, height: 800 })),
      addPage,
      save: vi.fn(async () => new Uint8Array([1, 2, 3])),
    };

    const result = await scannedImagesToPdf([
      { bytes: new ArrayBuffer(1), type: 'image/png', width: 800, height: 1200 },
      { bytes: new ArrayBuffer(1), type: 'image/jpeg', width: 1200, height: 800 },
    ], { format: 'letter', margin: 18 }, {
      createPdfDocument: vi.fn(async () => pdf),
    });

    expect(pdf.embedPng).toHaveBeenCalledOnce();
    expect(pdf.embedJpg).toHaveBeenCalledOnce();
    expect(addPage).toHaveBeenCalledTimes(2);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });
});
