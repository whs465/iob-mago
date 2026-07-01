import { describe, expect, it, vi } from 'vitest';
import { applySignedPdfDownloadAction } from './sign-download-action';

function makeFile(name = 'source.pdf') {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

describe('applySignedPdfDownloadAction', () => {
  it('returns validation statuses without building a download', async () => {
    const applySignatures = vi.fn(async () => ({ status: 'missing-image' as const }));

    await expect(applySignedPdfDownloadAction({
      file: makeFile(),
      imageBytes: null,
      imageType: 'image/png',
      markers: [{ page: 1, x: 1, y: 1, size: 1 }],
      applyAllPages: false,
      deps: { loadPdfDocument: vi.fn() },
      filenameSuffix: '-signed.pdf',
      applySignatures,
    })).resolves.toEqual({ status: 'missing-image' });
  });

  it('creates a blob and localized filename when signing succeeds', async () => {
    const applySignatures = vi.fn(async () => ({
      status: 'success' as const,
      file: makeFile('contract.v2.pdf'),
      pdfBytes: new Uint8Array([1, 2, 3]),
    }));

    const result = await applySignedPdfDownloadAction({
      file: makeFile(),
      imageBytes: new ArrayBuffer(1),
      imageType: 'image/png',
      markers: [{ page: 1, x: 1, y: 1, size: 1 }],
      applyAllPages: true,
      deps: { loadPdfDocument: vi.fn() },
      filenameSuffix: '-firmado.pdf',
      applySignatures,
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error('Expected success');
    expect(result.filename).toBe('contract.v2-firmado.pdf');
    expect(result.blob.type).toBe('application/pdf');
    await expect(result.blob.arrayBuffer()).resolves.toEqual(new Uint8Array([1, 2, 3]).buffer);
    expect(applySignatures).toHaveBeenCalledWith(expect.objectContaining({ applyAllPages: true }));
  });
});
