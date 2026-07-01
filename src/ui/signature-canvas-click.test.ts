// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import type { SignatureViewerState } from '../state/signature-viewer';
import { createSignatureMarkerFromCanvasClick } from './signature-canvas-click';

function createViewerState(): SignatureViewerState {
  return {
    file: null,
    pdfDocProxy: {
      numPages: 1,
      getPage: vi.fn(async () => ({
        view: [0, 0, 1000, 500] as [number, number, number, number],
        getViewport: vi.fn(),
        render: vi.fn(),
      })),
    },
    currentPage: 1,
    totalPages: 1,
    currentScale: 1,
    zoomLevel: 1,
    minZoomLevel: 1,
    maxZoomLevel: 2,
    pageWidth: 1000,
    pageHeight: 500,
    reset: vi.fn(),
    load: vi.fn(),
    clearLoadedPdf: vi.fn(),
    setRenderedPageMetrics: vi.fn(),
    canMovePage: vi.fn(),
    movePage: vi.fn(),
    canZoomOut: vi.fn(),
    canZoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomIn: vi.fn(),
    resetZoom: vi.fn(),
  };
}

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 250;
  canvas.getBoundingClientRect = vi.fn(() => ({
    left: 10,
    top: 20,
    right: 510,
    bottom: 270,
    width: 500,
    height: 250,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  }));
  return canvas;
}

describe('createSignatureMarkerFromCanvasClick', () => {
  it('creates a marker from canvas click coordinates', async () => {
    const marker = await createSignatureMarkerFromCanvasClick({
      event: new MouseEvent('click', { clientX: 260, clientY: 145 }),
      canvas: createCanvas(),
      viewerState: createViewerState(),
      size: 120,
      aspectRatio: 2,
    });

    expect(marker).toEqual({
      page: 1,
      size: 120,
      x: 500,
      y: 250,
      canvasX: 250,
      canvasY: 125,
    });
  });

  it('clamps marker center inside the canvas bounds', async () => {
    const marker = await createSignatureMarkerFromCanvasClick({
      event: new MouseEvent('click', { clientX: 10, clientY: 20 }),
      canvas: createCanvas(),
      viewerState: createViewerState(),
      size: 200,
      aspectRatio: 2,
    });

    expect(marker?.canvasX).toBe(50);
    expect(marker?.canvasY).toBe(25);
    expect(marker?.x).toBe(100);
    expect(marker?.y).toBe(450);
  });

  it('returns null when no PDF is loaded', async () => {
    const marker = await createSignatureMarkerFromCanvasClick({
      event: new MouseEvent('click', { clientX: 260, clientY: 145 }),
      canvas: createCanvas(),
      viewerState: {
        ...createViewerState(),
        pdfDocProxy: null,
      },
      size: 120,
      aspectRatio: 2,
    });

    expect(marker).toBeNull();
  });
});
