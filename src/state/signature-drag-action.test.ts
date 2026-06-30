// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createSignatureDragState } from './signature-drag';
import {
  dragSignatureMarker,
  stopSignatureMarkerDrag,
} from './signature-drag-action';
import { createSignatureMarkerState } from './signature-markers';

function makeCanvas() {
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

describe('signature drag actions', () => {
  it('moves the active marker from pointer coordinates', () => {
    const dragState = createSignatureDragState();
    const markerState = createSignatureMarkerState();
    const marker = { page: 1, x: 0, y: 0, size: 100 };
    markerState.addMarker(marker);
    dragState.start(0);
    const getMarkerPdfPositionFromCanvas = vi.fn(() => ({
      x: 200,
      y: 300,
      canvasX: 50,
      canvasY: 60,
    }));

    const result = dragSignatureMarker({
      event: new MouseEvent('pointermove', { clientX: 60, clientY: 80 }),
      canvas: makeCanvas(),
      pdfPage: { width: 1000, height: 500 },
      aspectRatio: 2,
      dragState,
      markerState,
      getMarkerPdfPositionFromCanvas,
    });

    expect(result.status).toBe('moved');
    expect(markerState.markers[0]).toEqual({
      page: 1,
      x: 200,
      y: 300,
      size: 100,
      canvasX: 50,
      canvasY: 60,
    });
    expect(dragState.movedDuringDrag).toBe(true);
    expect(getMarkerPdfPositionFromCanvas).toHaveBeenCalledWith(
      marker,
      { x: 50, y: 60 },
      { width: 500, height: 250 },
      { width: 1000, height: 500 },
      2,
    );
  });

  it('reports inactive and missing marker states', () => {
    const dragState = createSignatureDragState();
    const markerState = createSignatureMarkerState();

    expect(dragSignatureMarker({
      event: new MouseEvent('pointermove'),
      canvas: makeCanvas(),
      pdfPage: { width: 1000, height: 500 },
      aspectRatio: 1,
      dragState,
      markerState,
      getMarkerPdfPositionFromCanvas: vi.fn(),
    })).toEqual({ status: 'inactive' });

    dragState.start(4);
    expect(dragSignatureMarker({
      event: new MouseEvent('pointermove'),
      canvas: makeCanvas(),
      pdfPage: { width: 1000, height: 500 },
      aspectRatio: 1,
      dragState,
      markerState,
      getMarkerPdfPositionFromCanvas: vi.fn(),
    })).toEqual({ status: 'missing-marker' });
  });

  it('stops active drags and reports movement', () => {
    const dragState = createSignatureDragState();

    expect(stopSignatureMarkerDrag(dragState)).toEqual({ status: 'inactive' });

    dragState.start(0);
    dragState.markMoved();

    expect(stopSignatureMarkerDrag(dragState)).toEqual({
      status: 'stopped',
      movedDuringDrag: true,
    });
    expect(dragState.activeIndex).toBeNull();
  });
});
