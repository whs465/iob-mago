import { describe, expect, it, vi } from 'vitest';
import type { SignaturePdfDocProxy } from '../state/signature-viewer';
import { loadSignaturePdfDocument } from './signature-pdf-load';

function makeProxy(numPages: number): SignaturePdfDocProxy {
  return {
    numPages,
    getPage: vi.fn(),
  };
}

describe('loadSignaturePdfDocument', () => {
  it('loads a PDF.js document proxy from a file', async () => {
    const file = new File(['pdf-bytes'], 'contract.pdf', { type: 'application/pdf' });
    const pdfDocProxy = makeProxy(4);
    const getDocument = vi.fn(() => ({ promise: Promise.resolve(pdfDocProxy) }));

    const result = await loadSignaturePdfDocument(file, { getDocument });

    expect(getDocument).toHaveBeenCalledWith({ data: expect.any(ArrayBuffer) });
    expect(result).toEqual({
      file,
      pdfDocProxy,
      totalPages: 4,
    });
  });

  it('propagates PDF.js load errors', async () => {
    const error = new Error('bad pdf');
    const file = new File(['bad'], 'bad.pdf', { type: 'application/pdf' });

    await expect(loadSignaturePdfDocument(file, {
      getDocument: vi.fn(() => ({ promise: Promise.reject(error) })),
    })).rejects.toThrow('bad pdf');
  });
});
