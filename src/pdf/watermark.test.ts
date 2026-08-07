import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { addTextWatermark } from './watermark';

async function makePdfFile() {
  const pdf = await PDFDocument.create();
  pdf.addPage([400, 600]);
  const bytes = await pdf.save();
  return new File([bytes.slice().buffer as ArrayBuffer], 'source.pdf', { type: 'application/pdf' });
}

describe('addTextWatermark', () => {
  it('adds a text watermark and keeps the page count', async () => {
    const bytes = await addTextWatermark(await makePdfFile(), {
      text: 'CONFIDENTIAL', opacity: 0.2, fontSize: 48, angle: 45, pageIndices: null,
    }, { loadPdfDocument: buffer => PDFDocument.load(buffer) });
    const result = await PDFDocument.load(bytes);
    expect(result.getPageCount()).toBe(1);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('rejects blank watermark text', async () => {
    await expect(addTextWatermark(await makePdfFile(), {
      text: '   ', opacity: 0.2, fontSize: 48, angle: 45, pageIndices: null,
    }, { loadPdfDocument: buffer => PDFDocument.load(buffer) })).rejects.toThrow('Watermark text is required');
  });
});
