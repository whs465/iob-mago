import { describe, expect, it, vi } from 'vitest';
import { reorderPdfFlow } from './reorder-pdf-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);
}

function makeFile() {
  return new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
}

function makeOptions() {
  return {
    file: makeFile(),
    pageIndices: [2, 0, 1],
    deps: {} as never,
    i18n: translate,
    showStatus: vi.fn(),
    setActionBusy: vi.fn(() => vi.fn()),
    saveAs: vi.fn(),
  };
}

describe('reorderPdfFlow', () => {
  it('requires a file before reordering', async () => {
    const options = makeOptions();

    const result = await reorderPdfFlow({
      ...options,
      file: null,
    });

    expect(result).toEqual({ status: 'missing-file' });
    expect(options.showStatus).toHaveBeenCalledWith('Select a PDF file', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('reports empty-order when pageIndices is empty', async () => {
    const options = makeOptions();

    const result = await reorderPdfFlow({
      ...options,
      pageIndices: [],
    });

    expect(result).toEqual({ status: 'empty-order' });
    expect(options.showStatus).toHaveBeenCalledWith('No pages were loaded', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('returns busy when reordering is already processing', async () => {
    const options = makeOptions();
    options.setActionBusy.mockReturnValueOnce(null);

    const result = await reorderPdfFlow(options);

    expect(result).toEqual({ status: 'busy' });
    expect(options.saveAs).not.toHaveBeenCalled();
  });

  it('downloads the reordered PDF and shows success', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await reorderPdfFlow({
      ...options,
      reorderAction: vi.fn(async () => ({
        status: 'ok' as const,
        result: {
          pdfBytes: new Uint8Array([1, 2, 3]),
          rasterizedFiles: [],
        },
      })),
    });

    expect(result).toEqual({
      status: 'success',
      filename: 'contract-reordered.pdf',
      rasterizedFiles: [],
    });
    expect(options.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'contract-reordered.pdf');
    expect(options.showStatus).toHaveBeenLastCalledWith('PDF reordered successfully!', 'success');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('shows rasterized file note when protected pages were flattened', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await reorderPdfFlow({
      ...options,
      reorderAction: vi.fn(async () => ({
        status: 'ok' as const,
        result: {
          pdfBytes: new Uint8Array([1, 2, 3]),
          rasterizedFiles: ['protected.pdf'],
        },
      })),
    });

    expect(result).toEqual({ status: 'success', filename: 'contract-reordered.pdf', rasterizedFiles: ['protected.pdf'] });
    expect(options.showStatus).toHaveBeenLastCalledWith(
      'PDF reordered successfully. Protected pages were flattened as images.',
      'success',
    );
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('reports reorder errors and clears busy state', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    const error = new Error('reorder failed');
    const logError = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await reorderPdfFlow({
      ...options,
      reorderAction: vi.fn(async () => {
        throw error;
      }),
      logError,
    });

    expect(result).toEqual({ status: 'error', message: 'reorder failed' });
    expect(logError).toHaveBeenCalledWith(error);
    expect(options.showStatus).toHaveBeenLastCalledWith('Error reordering PDF: reorder failed', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });
});
