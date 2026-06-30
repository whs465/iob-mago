import { describe, expect, it, vi } from 'vitest';
import type { PdfOperationDeps } from './operations';
import { splitPdfFileAction } from './split-action';

function makeFile() {
  return new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
}

describe('splitPdfFileAction', () => {
  it('rejects missing files', async () => {
    const splitPdfIntoPages = vi.fn();

    const result = await splitPdfFileAction(null, {
      operationDeps: {} as PdfOperationDeps,
      splitPdfIntoPages,
    });

    expect(result).toEqual({ status: 'missing-file' });
    expect(splitPdfIntoPages).not.toHaveBeenCalled();
  });

  it('splits the provided PDF file', async () => {
    const file = makeFile();
    const operationDeps = {} as PdfOperationDeps;
    const splitPdfIntoPages = vi.fn(async () => ({
      pageCount: 1,
      pages: [{ filename: 'pagina-001.pdf', pdfBytes: new Uint8Array([1]) }],
    }));

    const result = await splitPdfFileAction(file, {
      operationDeps,
      splitPdfIntoPages,
    });

    expect(result).toEqual({
      status: 'ok',
      result: {
        pageCount: 1,
        pages: [{ filename: 'pagina-001.pdf', pdfBytes: new Uint8Array([1]) }],
      },
    });
    expect(splitPdfIntoPages).toHaveBeenCalledWith(file, operationDeps);
  });
});
