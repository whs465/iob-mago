// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  clearPdfCanvas,
  hideSignaturePdfViewer,
  resetSignatureZoomControls,
  resetSignaturePageControls,
  showSignaturePdfViewer,
  syncSignatureMarkerLayerSize,
  updateSignaturePageControls,
  updateSignatureZoomControls,
} from './signature-viewer';

function setupViewerDom() {
  document.body.innerHTML = `
    <div id="pdf-controls"></div>
    <div id="canvas-wrapper"></div>
    <div id="help-text"></div>
    <div id="page-info"></div>
    <div id="zoom-info"></div>
    <button id="prev-page"></button>
    <button id="next-page"></button>
    <button id="zoom-out"></button>
    <button id="zoom-in"></button>
    <div id="signature-markers"></div>
    <canvas id="pdf-canvas" width="200" height="100"></canvas>
  `;
}

describe('signature viewer UI helpers', () => {
  it('shows and hides the viewer regions', () => {
    setupViewerDom();

    showSignaturePdfViewer();

    expect(document.getElementById('pdf-controls')?.style.display).toBe('flex');
    expect(document.getElementById('canvas-wrapper')?.style.display).toBe('block');
    expect(document.getElementById('help-text')?.style.display).toBe('block');

    hideSignaturePdfViewer();

    expect(document.getElementById('pdf-controls')?.style.display).toBe('none');
    expect(document.getElementById('canvas-wrapper')?.style.display).toBe('none');
    expect(document.getElementById('help-text')?.style.display).toBe('none');
  });

  it('updates and resets page controls', () => {
    setupViewerDom();
    const format = (page: number, total: number) => `Page ${page} of ${total}`;

    updateSignaturePageControls(2, 3, format);

    expect(document.getElementById('page-info')?.textContent).toBe('Page 2 of 3');
    expect((document.getElementById('prev-page') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('next-page') as HTMLButtonElement).disabled).toBe(false);

    resetSignaturePageControls(format);

    expect(document.getElementById('page-info')?.textContent).toBe('Page 1 of 1');
    expect((document.getElementById('prev-page') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('next-page') as HTMLButtonElement).disabled).toBe(true);
  });

  it('updates and resets zoom controls', () => {
    setupViewerDom();
    const format = (zoomLevel: number) => `${Math.round(zoomLevel * 100)}%`;

    updateSignatureZoomControls(1.5, 1, 2, format);

    expect(document.getElementById('zoom-info')?.textContent).toBe('150%');
    expect((document.getElementById('zoom-out') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('zoom-in') as HTMLButtonElement).disabled).toBe(false);

    resetSignatureZoomControls(format);

    expect(document.getElementById('zoom-info')?.textContent).toBe('100%');
    expect((document.getElementById('zoom-out') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('zoom-in') as HTMLButtonElement).disabled).toBe(false);
  });

  it('syncs the marker layer to the rendered canvas size', () => {
    setupViewerDom();

    syncSignatureMarkerLayerSize(720, 900);

    const markerLayer = document.getElementById('signature-markers');
    expect(markerLayer?.style.width).toBe('720px');
    expect(markerLayer?.style.height).toBe('900px');
  });

  it('clears the PDF canvas', () => {
    setupViewerDom();
    const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
    const clearRect = vi.fn();
    vi.spyOn(canvas, 'getContext').mockReturnValue({ clearRect } as unknown as CanvasRenderingContext2D);

    clearPdfCanvas();

    expect(clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
  });
});
