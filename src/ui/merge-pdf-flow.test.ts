import { describe, expect, it, vi } from 'vitest';
import { mergePdfFlow } from './merge-pdf-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);
}

function makeFiles() {
  return [
    new File(['one'], 'one.pdf', { type: 'application/pdf' }),
    new File(['two'], 'two.pdf', { type: 'application/pdf' }),
  ];
}

function makeOptions() {
  return {
    files: makeFiles(),
    addFileBookmarks: true,
    operationDeps: {} as never,
    i18n: translate,
    showStatus: vi.fn(),
    setActionBusy: vi.fn(() => vi.fn()),
    saveAs: vi.fn(),
  };
}

describe('mergePdfFlow', () => {
  it('requires at least two files before entering busy state', async () => {
    const options = makeOptions();

    const result = await mergePdfFlow({
      ...options,
      files: [options.files[0]],
    });

    expect(result).toEqual({ status: 'not-enough-files' });
    expect(options.showStatus).toHaveBeenCalledWith('Select at least 2 PDF files', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('returns busy when the merge action is already processing', async () => {
    const options = makeOptions();
    options.setActionBusy.mockReturnValueOnce(null);

    const result = await mergePdfFlow(options);

    expect(result).toEqual({ status: 'busy' });
    expect(options.saveAs).not.toHaveBeenCalled();
  });

  it('merges files, reports per-file progress and downloads the merged PDF', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);
    const mergeAction = vi.fn(async (_files, deps) => {
      deps.onFileProcessing?.(options.files[0]);
      deps.onFileProcessing?.(options.files[1]);
      return {
        status: 'ok' as const,
        result: {
          pdfBytes: new Uint8Array([1, 2, 3]),
          rasterizedFiles: ['protected.pdf'],
        },
      };
    });

    const result = await mergePdfFlow({
      ...options,
      mergeAction,
    });

    expect(result).toEqual({ status: 'success', filename: 'merged-document.pdf' });
    expect(mergeAction).toHaveBeenCalledWith(options.files, expect.objectContaining({
      addFileBookmarks: true,
      operationDeps: options.operationDeps,
      onFileProcessing: expect.any(Function),
    }));
    expect(options.showStatus).toHaveBeenCalledWith('Processing...', 'processing');
    expect(options.showStatus).toHaveBeenCalledWith('Processing one.pdf...', 'processing');
    expect(options.showStatus).toHaveBeenLastCalledWith(
      'PDFs merged successfully. Protected files were flattened as images: protected.pdf',
      'success',
    );
    expect(options.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'merged-document.pdf');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('reports merge errors and clears busy state', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    const error = new Error('merge failed');
    const logError = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await mergePdfFlow({
      ...options,
      mergeAction: vi.fn(async () => {
        throw error;
      }),
      logError,
    });

    expect(result).toEqual({ status: 'error', message: 'merge failed' });
    expect(logError).toHaveBeenCalledWith(error);
    expect(options.showStatus).toHaveBeenLastCalledWith('Error merging PDFs: merge failed', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });
});
