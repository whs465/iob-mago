import { describe, expect, it, vi } from 'vitest';
import { splitPdfFlow } from './split-pdf-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);
}

function makeFile() {
  return new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
}

function makeOptions() {
  return {
    file: makeFile(),
    asZip: true,
    operationDeps: {} as never,
    i18n: translate,
    showStatus: vi.fn(),
    setActionBusy: vi.fn(() => vi.fn()),
    saveAs: vi.fn(),
    JSZipCtor: vi.fn() as never,
  };
}

describe('splitPdfFlow', () => {
  it('requires a file before entering busy state', async () => {
    const options = makeOptions();

    const result = await splitPdfFlow({
      ...options,
      file: null,
    });

    expect(result).toEqual({ status: 'missing-file' });
    expect(options.showStatus).toHaveBeenCalledWith('Select a PDF file', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('returns busy when splitting is already in progress', async () => {
    const options = makeOptions();
    options.setActionBusy.mockReturnValueOnce(null);

    const result = await splitPdfFlow(options);

    expect(result).toEqual({ status: 'busy' });
    expect(options.saveAs).not.toHaveBeenCalled();
  });

  it('splits and downloads the resulting pages', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    const splitAction = vi.fn(async () => ({
      status: 'ok' as const,
      result: {
        pageCount: 2,
        pages: [
          { filename: 'pagina-001.pdf', pdfBytes: new Uint8Array([1]) },
          { filename: 'pagina-002.pdf', pdfBytes: new Uint8Array([2]) },
        ],
      },
    }));
    const downloadResult = vi.fn(async () => undefined);
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await splitPdfFlow({
      ...options,
      splitAction,
      downloadResult,
    });

    expect(result).toEqual({ status: 'success', pageCount: 2 });
    expect(splitAction).toHaveBeenCalledWith(options.file, {
      operationDeps: options.operationDeps,
    });
    expect(downloadResult).toHaveBeenCalledWith(expect.objectContaining({ pageCount: 2 }), {
      asZip: true,
      sourceFilename: 'contract.pdf',
      zipSuffix: '-split.zip',
      pagePrefix: 'page',
      JSZipCtor: options.JSZipCtor,
      saveAs: options.saveAs,
    });
    expect(options.showStatus).toHaveBeenLastCalledWith('PDF split into 2 pages!', 'success');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('reports splitting errors and clears busy state', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    const error = new Error('split failed');
    const logError = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await splitPdfFlow({
      ...options,
      splitAction: vi.fn(async () => {
        throw error;
      }),
      logError,
    });

    expect(result).toEqual({ status: 'error', message: 'split failed' });
    expect(logError).toHaveBeenCalledWith(error);
    expect(options.showStatus).toHaveBeenLastCalledWith('Error splitting PDF: split failed', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });
});
