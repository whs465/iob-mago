import { describe, expect, it, vi } from 'vitest';
import { applySignatureFlow } from './signature-apply-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);
}

function makeValidOptions() {
  return {
    file: new File(['pdf'], 'contract.pdf', { type: 'application/pdf' }),
    imageBytes: new ArrayBuffer(4),
    markers: [{ page: 1, x: 10, y: 20, size: 90 }],
    applyAllPages: true,
    deps: { loadPdfDocument: vi.fn() },
    i18n: translate,
    showStatus: vi.fn(),
    setActionBusy: vi.fn(() => vi.fn()),
    saveAs: vi.fn(),
  };
}

describe('applySignatureFlow', () => {
  it('reports validation errors before entering busy state', async () => {
    const options = makeValidOptions();

    const result = await applySignatureFlow({
      ...options,
      file: null,
    });

    expect(result).toEqual({ status: 'missing-pdf' });
    expect(options.showStatus).toHaveBeenCalledWith('Select a PDF to sign', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('returns busy when the action button cannot enter processing state', async () => {
    const options = makeValidOptions();
    options.setActionBusy.mockReturnValueOnce(null);

    const result = await applySignatureFlow(options);

    expect(result).toEqual({ status: 'busy' });
    expect(options.showStatus).not.toHaveBeenCalledWith('Applying signature(s)...', 'processing');
    expect(options.saveAs).not.toHaveBeenCalled();
  });

  it('downloads the signed PDF and shows success', async () => {
    const options = makeValidOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await applySignatureFlow({
      ...options,
      applySignedPdfDownload: vi.fn(async () => ({
        status: 'success' as const,
        blob: new Blob(['pdf'], { type: 'application/pdf' }),
        filename: 'contract-signed.pdf',
      })),
    });

    expect(result).toEqual({ status: 'success', filename: 'contract-signed.pdf' });
    expect(options.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'contract-signed.pdf');
    expect(options.showStatus).toHaveBeenLastCalledWith('Signature applied successfully!', 'success');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('reports signing errors and always clears busy state', async () => {
    const options = makeValidOptions();
    const finishProcessing = vi.fn();
    const error = new Error('bad sign');
    const logError = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await applySignatureFlow({
      ...options,
      applySignedPdfDownload: vi.fn(async () => {
        throw error;
      }),
      logError,
    });

    expect(result).toEqual({ status: 'error', message: 'bad sign' });
    expect(logError).toHaveBeenCalledWith(error);
    expect(options.showStatus).toHaveBeenLastCalledWith('Error applying signature: bad sign', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });
});
