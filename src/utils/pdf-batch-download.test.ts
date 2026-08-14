import { describe, expect, it, vi } from 'vitest';
import { downloadPdfOutputs } from './pdf-batch-download';

describe('downloadPdfOutputs', () => {
  it('downloads one PDF directly', async () => {
    const saveAs = vi.fn();
    await downloadPdfOutputs([{ filename: 'one.pdf', pdfBytes: new Uint8Array([1]) }], {
      zipFilename: 'batch.zip', saveAs,
    });
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'one.pdf');
  });

  it('packages multiple PDFs in a ZIP', async () => {
    const file = vi.fn();
    class FakeZip {
      file = file;
      generateAsync = vi.fn(async () => new Blob(['zip']));
    }
    const saveAs = vi.fn();
    await downloadPdfOutputs([
      { filename: 'one.pdf', pdfBytes: new Uint8Array([1]) },
      { filename: 'two.pdf', pdfBytes: new Uint8Array([2]) },
    ], { zipFilename: 'batch.zip', JSZipCtor: FakeZip, saveAs });
    expect(file).toHaveBeenCalledTimes(2);
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'batch.zip');
  });
});
