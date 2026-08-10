import { describe, expect, it, vi } from 'vitest';
import { rotatePdfFlow } from './rotate-pdf-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);
}

function makeFile() {
  return new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
}

function makeOptions() {
  return {
    file: makeFile(),
    pagesText: '',
    deps: {} as never,
    i18n: translate,
    showStatus: vi.fn(),
    setActionBusy: vi.fn(() => vi.fn()),
    saveAs: vi.fn(),
  };
}

describe('rotatePdfFlow', () => {
  it('requires a file before rotating', async () => {
    const options = makeOptions();

    const result = await rotatePdfFlow({
      ...options,
      file: null,
    });

    expect(result).toEqual({ status: 'missing-file' });
    expect(options.showStatus).toHaveBeenCalledWith('Select a PDF file', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('returns busy when rotation is already processing', async () => {
    const options = makeOptions();
    options.setActionBusy.mockReturnValueOnce(null);

    const result = await rotatePdfFlow(options);

    expect(result).toEqual({ status: 'busy' });
    expect(options.saveAs).not.toHaveBeenCalled();
  });

  it('reports invalid page selections', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await rotatePdfFlow({
      ...options,
      rotateAction: vi.fn(async () => ({ status: 'invalid-pages' as const })),
    });

    expect(result).toEqual({ status: 'invalid-pages' });
    expect(options.showStatus).toHaveBeenLastCalledWith('No valid pages were found', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('reports no-landscape-pages when no landscape pages found', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await rotatePdfFlow({
      ...options,
      rotateAction: vi.fn(async () => ({ status: 'no-landscape-pages' as const })),
    });

    expect(result).toEqual({ status: 'no-landscape-pages' });
    expect(options.showStatus).toHaveBeenLastCalledWith('No landscape pages were found in the selected range', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('downloads the rotated PDF and shows success', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await rotatePdfFlow({
      ...options,
      rotateAction: vi.fn(async () => ({
        status: 'ok' as const,
        result: {
          pdfBytes: new Uint8Array([1, 2, 3]),
          rasterizedFiles: [],
          rotatedCount: 2,
        },
      })),
    });

    expect(result).toEqual({
      status: 'success',
      filename: 'contract-rotated.pdf',
      rotatedCount: 2,
      rasterizedFiles: [],
    });
    expect(options.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'contract-rotated.pdf');
    expect(options.showStatus).toHaveBeenLastCalledWith('2 page(s) rotated!', 'success');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('shows rasterized file note when protected pages were flattened', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await rotatePdfFlow({
      ...options,
      rotateAction: vi.fn(async () => ({
        status: 'ok' as const,
        result: {
          pdfBytes: new Uint8Array([1, 2, 3]),
          rasterizedFiles: ['protected.pdf'],
          rotatedCount: 1,
        },
      })),
    });

    expect(result).toEqual({
      status: 'success',
      filename: 'contract-rotated.pdf',
      rotatedCount: 1,
      rasterizedFiles: ['protected.pdf'],
    });
    expect(options.showStatus).toHaveBeenLastCalledWith(
      '1 page(s) rotated. Protected pages were flattened as images.',
      'success',
    );
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('reports rotation errors and clears busy state', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    const error = new Error('rotate failed');
    const logError = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await rotatePdfFlow({
      ...options,
      rotateAction: vi.fn(async () => {
        throw error;
      }),
      logError,
    });

    expect(result).toEqual({ status: 'error', message: 'rotate failed' });
    expect(logError).toHaveBeenCalledWith(error);
    expect(options.showStatus).toHaveBeenLastCalledWith('Error rotating PDF: rotate failed', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });
});
