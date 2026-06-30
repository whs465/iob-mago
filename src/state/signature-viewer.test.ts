import { describe, expect, it } from 'vitest';
import { createSignatureViewerState, type SignaturePdfDocProxy } from './signature-viewer';

function makeFile(name: string) {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

function makeProxy(numPages: number): SignaturePdfDocProxy {
  return {
    numPages,
    getPage: async () => ({
      view: [0, 0, 100, 100],
      getViewport: () => ({ width: 100, height: 100 }),
      render: () => ({ promise: Promise.resolve() }),
    }),
  };
}

describe('signature viewer state', () => {
  it('loads and clears a PDF viewer session', () => {
    const state = createSignatureViewerState();
    const file = makeFile('contract.pdf');
    const proxy = makeProxy(3);

    state.load(file, proxy, 3);

    expect(state.file).toBe(file);
    expect(state.pdfDocProxy).toBe(proxy);
    expect(state.currentPage).toBe(1);
    expect(state.totalPages).toBe(3);

    state.clearLoadedPdf();

    expect(state.file).toBeNull();
    expect(state.pdfDocProxy).toBeNull();
    expect(state.totalPages).toBe(0);
  });

  it('tracks rendered page metrics', () => {
    const state = createSignatureViewerState();

    state.setRenderedPageMetrics(800, 1000, 0.5);

    expect(state.pageWidth).toBe(800);
    expect(state.pageHeight).toBe(1000);
    expect(state.currentScale).toBe(0.5);
  });

  it('moves only inside loaded page bounds', () => {
    const state = createSignatureViewerState();
    state.load(makeFile('contract.pdf'), makeProxy(2), 2);

    expect(state.movePage(-1)).toBeNull();
    expect(state.movePage(1)).toBe(2);
    expect(state.currentPage).toBe(2);
    expect(state.movePage(1)).toBeNull();
  });
});
