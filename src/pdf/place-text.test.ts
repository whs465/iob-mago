import { describe, expect, it, vi } from 'vitest';
import { placeTextOnPdf } from './place-text';

describe('placeTextOnPdf', () => {
  it('places trimmed text inside the selected page bounds', async () => {
    const drawText = vi.fn();
    const save = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const loadPdfDocument = vi.fn(async () => ({
      getPages: () => [
        { getSize: () => ({ width: 600, height: 800 }), drawText: vi.fn() },
        { getSize: () => ({ width: 300, height: 400 }), drawText },
      ],
      embedFont: vi.fn(async () => ({
        widthOfTextAtSize: () => 120,
        heightAtSize: () => 14,
      })),
      save,
    }));
    const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });

    const result = await placeTextOnPdf(file, {
      text: '  Revisado  ', pageIndex: 1, x: 280, y: 10, fontSize: 12,
    }, { loadPdfDocument: loadPdfDocument as never });

    expect(drawText).toHaveBeenCalledWith('Revisado', expect.objectContaining({
      x: 280,
      y: -4,
      size: 12,
    }));
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects empty text and missing pages', async () => {
    const file = new File(['pdf'], 'report.pdf');
    await expect(placeTextOnPdf(file, {
      text: ' ', pageIndex: 0, x: 0, y: 0, fontSize: 12,
    }, { loadPdfDocument: vi.fn() as never })).rejects.toThrow('Text is required');

    await expect(placeTextOnPdf(file, {
      text: 'Hello', pageIndex: 2, x: 0, y: 0, fontSize: 12,
    }, {
      loadPdfDocument: vi.fn(async () => ({ getPages: () => [] })) as never,
    })).rejects.toThrow('Selected page does not exist');
  });
});
