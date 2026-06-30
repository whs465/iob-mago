import { describe, expect, it, vi } from 'vitest';
import { extractPdfFlow } from './extract-pdf-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);
}

function makeFile() {
  return new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
}

function makeOptions() {
  return {
    file: makeFile(),
    pagesText: '1,3',
    deps: {} as never,
    i18n: translate,
    showStatus: vi.fn(),
    setActionBusy: vi.fn(() => vi.fn()),
    saveAs: vi.fn(),
  };
}

describe('extractPdfFlow', () => {
  it('requires a file before extracting', async () => {
    const options = makeOptions();

    const result = await extractPdfFlow({
      ...options,
      file: null,
    });

    expect(result).toEqual({ status: 'missing-file' });
    expect(options.showStatus).toHaveBeenCalledWith('Select a PDF file', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('requires page text before extracting', async () => {
    const options = makeOptions();

    const result = await extractPdfFlow({
      ...options,
      pagesText: '',
    });

    expect(result).toEqual({ status: 'missing-pages' });
    expect(options.showStatus).toHaveBeenCalledWith('Enter the pages to extract', 'error');
    expect(options.setActionBusy).not.toHaveBeenCalled();
  });

  it('returns busy when extraction is already processing', async () => {
    const options = makeOptions();
    options.setActionBusy.mockReturnValueOnce(null);

    const result = await extractPdfFlow(options);

    expect(result).toEqual({ status: 'busy' });
    expect(options.saveAs).not.toHaveBeenCalled();
  });

  it('reports invalid page selections', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await extractPdfFlow({
      ...options,
      extractAction: vi.fn(async () => ({ status: 'invalid-pages' as const })),
    });

    expect(result).toEqual({ status: 'invalid-pages' });
    expect(options.showStatus).toHaveBeenLastCalledWith('No valid pages were found', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('downloads the extracted pages PDF and shows success', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await extractPdfFlow({
      ...options,
      extractAction: vi.fn(async () => ({
        status: 'ok' as const,
        result: {
          pdfBytes: new Uint8Array([1, 2, 3]),
          rasterizedFiles: [],
          extractedPageCount: 2,
        },
      })),
    });

    expect(result).toEqual({
      status: 'success',
      filename: 'contract-extracted.pdf',
      extractedPageCount: 2,
    });
    expect(options.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'contract-extracted.pdf');
    expect(options.showStatus).toHaveBeenLastCalledWith('2 page(s) extracted successfully!', 'success');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });

  it('reports extraction errors and clears busy state', async () => {
    const options = makeOptions();
    const finishProcessing = vi.fn();
    const error = new Error('extract failed');
    const logError = vi.fn();
    options.setActionBusy.mockReturnValueOnce(finishProcessing);

    const result = await extractPdfFlow({
      ...options,
      extractAction: vi.fn(async () => {
        throw error;
      }),
      logError,
    });

    expect(result).toEqual({ status: 'error', message: 'extract failed' });
    expect(logError).toHaveBeenCalledWith(error);
    expect(options.showStatus).toHaveBeenLastCalledWith('Error extracting pages: extract failed', 'error');
    expect(finishProcessing).toHaveBeenCalledTimes(1);
  });
});
