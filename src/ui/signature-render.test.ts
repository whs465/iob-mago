// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import type { SignatureViewerState } from '../state/signature-viewer';
import { renderSignaturePdfPage } from './signature-render';

function createViewerState(): SignatureViewerState {
  const render = vi.fn(() => ({ promise: Promise.resolve() }));
  const page = {
    view: [0, 0, 1000, 500] as [number, number, number, number],
    getViewport: vi.fn(({ scale }: { scale: number }) => ({
      width: 1000 * scale,
      height: 500 * scale,
    })),
    render,
  };
  return {
    file: null,
    pdfDocProxy: {
      numPages: 3,
      getPage: vi.fn(async () => page),
    },
    currentPage: 1,
    totalPages: 3,
    currentScale: 1,
    pageWidth: 0,
    pageHeight: 0,
    reset: vi.fn(),
    load: vi.fn(),
    clearLoadedPdf: vi.fn(),
    setRenderedPageMetrics: vi.fn(),
    canMovePage: vi.fn(),
    movePage: vi.fn(),
  };
}

describe('renderSignaturePdfPage', () => {
  it('renders the requested page and updates viewer metrics', async () => {
    document.body.innerHTML = `
      <div id="page-info"></div>
      <button id="prev-page"></button>
      <button id="next-page"></button>
    `;
    const viewerState = createViewerState();
    const canvas = document.createElement('canvas');
    const canvasWrapper = document.createElement('div');
    Object.defineProperty(canvasWrapper, 'clientWidth', { value: 600 });
    Object.defineProperty(canvas, 'getContext', {
      value: vi.fn(() => ({})),
    });
    const onRendered = vi.fn();

    const rendered = await renderSignaturePdfPage({
      viewerState,
      pageNumber: 2,
      canvas,
      canvasWrapper,
      formatPageInfo: (page, total) => `Page ${page} / ${total}`,
      onRendered,
    });

    expect(rendered).toBe(true);
    expect(viewerState.pdfDocProxy?.getPage).toHaveBeenCalledWith(2);
    expect(viewerState.setRenderedPageMetrics).toHaveBeenCalledWith(1000, 500, 0.6);
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(300);
    expect(document.getElementById('page-info')?.textContent).toBe('Page 2 / 3');
    expect(onRendered).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no PDF is loaded', async () => {
    const viewerState = {
      ...createViewerState(),
      pdfDocProxy: null,
    };
    const canvas = document.createElement('canvas');
    const canvasWrapper = document.createElement('div');

    await expect(renderSignaturePdfPage({
      viewerState,
      pageNumber: 1,
      canvas,
      canvasWrapper,
      formatPageInfo: () => '',
    })).resolves.toBe(false);
  });
});
