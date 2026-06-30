import { describe, expect, it, vi } from 'vitest';
import { createSignatureMarkerState } from '../state/signature-markers';
import { createSignatureViewerState, type SignaturePdfDocProxy } from '../state/signature-viewer';
import { loadSignaturePdfFlow } from './signature-pdf-load-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{{${key}}}`, value),
    english,
  );
}

function createPdfDocProxy(numPages: number): SignaturePdfDocProxy {
  return {
    numPages,
    getPage: vi.fn(),
  };
}

describe('signature PDF load flow', () => {
  it('loads a PDF into the signature viewer and renders the first page', async () => {
    const file = new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
    const viewerState = createSignatureViewerState();
    const markerState = createSignatureMarkerState();
    markerState.addMarker({ page: 1, x: 10, y: 20, size: 90 });
    const pdfDocProxy = createPdfDocProxy(4);
    const showStatus = vi.fn();
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();
    const renderPage = vi.fn(async () => undefined);
    const showViewer = vi.fn();
    const updatePdfLabel = vi.fn();

    const result = await loadSignaturePdfFlow({
      file,
      viewerState,
      markerState,
      i18n: translate,
      showStatus,
      loadPdfDocument: vi.fn(async () => ({ file, pdfDocProxy, totalPages: 4 })),
      renderPage,
      updateMarkersDisplay,
      updateSignatureList,
      showViewer,
      updatePdfLabel,
    });

    expect(result).toEqual({ status: 'ok', totalPages: 4 });
    expect(markerState.markers).toEqual([]);
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
    expect(updateSignatureList).toHaveBeenCalledTimes(1);
    expect(viewerState.file).toBe(file);
    expect(viewerState.pdfDocProxy).toBe(pdfDocProxy);
    expect(viewerState.currentPage).toBe(1);
    expect(viewerState.totalPages).toBe(4);
    expect(showViewer).toHaveBeenCalledTimes(1);
    expect(updatePdfLabel).toHaveBeenCalledWith('contract.pdf', true);
    expect(renderPage).toHaveBeenCalledWith(1);
    expect(showStatus).toHaveBeenNthCalledWith(1, 'Loading PDF...', 'processing');
    expect(showStatus).toHaveBeenLastCalledWith('PDF loaded: 4 page(s)', 'success');
  });

  it('clears the loaded PDF and reports errors when loading fails', async () => {
    const file = new File(['bad'], 'bad.pdf', { type: 'application/pdf' });
    const viewerState = createSignatureViewerState();
    const markerState = createSignatureMarkerState();
    viewerState.load(file, createPdfDocProxy(2), 2);
    markerState.addMarker({ page: 1, x: 10, y: 20, size: 90 });
    const error = new Error('bad pdf');
    const showStatus = vi.fn();
    const logError = vi.fn();
    const renderPage = vi.fn(async () => undefined);

    const result = await loadSignaturePdfFlow({
      file,
      viewerState,
      markerState,
      i18n: translate,
      showStatus,
      loadPdfDocument: vi.fn(async () => {
        throw error;
      }),
      renderPage,
      updateMarkersDisplay: vi.fn(),
      updateSignatureList: vi.fn(),
      showViewer: vi.fn(),
      updatePdfLabel: vi.fn(),
      logError,
    });

    expect(result).toEqual({ status: 'error', message: 'bad pdf' });
    expect(viewerState.file).toBeNull();
    expect(viewerState.pdfDocProxy).toBeNull();
    expect(viewerState.totalPages).toBe(0);
    expect(markerState.markers).toEqual([]);
    expect(renderPage).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(error);
    expect(showStatus).toHaveBeenLastCalledWith('Error loading PDF: bad pdf', 'error');
  });
});
