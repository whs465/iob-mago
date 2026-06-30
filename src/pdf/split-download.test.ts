import { describe, expect, it, vi } from 'vitest';
import { downloadSplitPdfResult } from './split-download';
import type { SplitPdfResult } from './operations';

function makeResult(): SplitPdfResult {
  return {
    pageCount: 2,
    pages: [
      { filename: 'pagina-001.pdf', pdfBytes: new Uint8Array([1]) },
      { filename: 'pagina-002.pdf', pdfBytes: new Uint8Array([2]) },
    ],
  };
}

describe('downloadSplitPdfResult', () => {
  it('downloads split pages as one zip', async () => {
    const zipBlob = new Blob(['zip'], { type: 'application/zip' });
    const zip = {
      file: vi.fn(),
      generateAsync: vi.fn(async () => zipBlob),
    };
    const JSZipCtor = vi.fn(class {
      file = zip.file;
      generateAsync = zip.generateAsync;
    });
    const saveAs = vi.fn();

    await downloadSplitPdfResult(makeResult(), {
      asZip: true,
      sourceFilename: 'contract.pdf',
      zipSuffix: '-separado.zip',
      pagePrefix: 'pagina',
      JSZipCtor,
      saveAs,
    });

    expect(zip.file).toHaveBeenNthCalledWith(1, 'pagina-001.pdf', new Uint8Array([1]));
    expect(zip.file).toHaveBeenNthCalledWith(2, 'pagina-002.pdf', new Uint8Array([2]));
    expect(zip.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
    expect(saveAs).toHaveBeenCalledWith(zipBlob, 'contract-separado.zip');
  });

  it('downloads split pages individually with a delay between files', async () => {
    const saveAs = vi.fn();
    const delay = vi.fn(async () => undefined);

    await downloadSplitPdfResult(makeResult(), {
      asZip: false,
      sourceFilename: 'contract.pdf',
      zipSuffix: '-separado.zip',
      pagePrefix: 'page',
      JSZipCtor: vi.fn(),
      saveAs,
      delay,
    });

    expect(saveAs).toHaveBeenCalledTimes(2);
    expect(saveAs.mock.calls[0][1]).toBe('page-001.pdf');
    expect(saveAs.mock.calls[1][1]).toBe('page-002.pdf');
    expect(delay).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(100);
  });
});
