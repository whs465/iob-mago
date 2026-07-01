import { describe, expect, it, vi } from 'vitest';
import { applyPdfSignatures, validatePdfSignatureInputs } from './sign-action';

function makeFile() {
  return new File(['pdf'], 'source.pdf', { type: 'application/pdf' });
}

function makePdfDoc() {
  return {
    embedPng: vi.fn(async () => ({ width: 100, height: 50 })),
    embedJpg: vi.fn(async () => ({ width: 100, height: 50 })),
    getPageCount: vi.fn(() => 1),
    getPage: vi.fn(() => ({ drawImage: vi.fn() })),
    save: vi.fn(async () => new Uint8Array([7, 8, 9])),
  };
}

describe('applyPdfSignatures', () => {
  it('validates required inputs before signing', () => {
    expect(validatePdfSignatureInputs({
      file: null,
      imageBytes: new ArrayBuffer(1),
      markers: [{ page: 1, x: 1, y: 1, size: 1 }],
    })).toBe('missing-pdf');
    expect(validatePdfSignatureInputs({
      file: makeFile(),
      imageBytes: null,
      markers: [{ page: 1, x: 1, y: 1, size: 1 }],
    })).toBe('missing-image');
    expect(validatePdfSignatureInputs({
      file: makeFile(),
      imageBytes: new ArrayBuffer(1),
      markers: [],
    })).toBe('missing-markers');
  });

  it('returns signed bytes for valid input', async () => {
    const pdfDoc = makePdfDoc();
    const result = await applyPdfSignatures({
      file: makeFile(),
      imageBytes: new ArrayBuffer(1),
      imageType: 'image/png',
      markers: [{ page: 1, x: 50, y: 50, size: 20 }],
      applyAllPages: false,
      deps: {
        loadPdfDocument: vi.fn(async () => pdfDoc),
      },
    });

    expect(result).toEqual({
      status: 'success',
      file: expect.any(File),
      pdfBytes: new Uint8Array([7, 8, 9]),
    });
    expect(pdfDoc.save).toHaveBeenCalledOnce();
  });

  it('returns a validation status without loading the PDF', async () => {
    const loadPdfDocument = vi.fn();

    await expect(applyPdfSignatures({
      file: null,
      imageBytes: new ArrayBuffer(1),
      imageType: 'image/png',
      markers: [{ page: 1, x: 1, y: 1, size: 1 }],
      applyAllPages: false,
      deps: { loadPdfDocument },
    })).resolves.toEqual({ status: 'missing-pdf' });
    expect(loadPdfDocument).not.toHaveBeenCalled();
  });
});
