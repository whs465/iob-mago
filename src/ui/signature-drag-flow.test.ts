// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createSignatureDragState } from '../state/signature-drag';
import { createSignatureMarkerState } from '../state/signature-markers';
import {
  handleSignatureDragFlow,
  stopSignatureDragFlow,
} from './signature-drag-flow';

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

describe('signature drag flow', () => {
  it('refreshes markers only when a drag move succeeds', () => {
    const dragState = createSignatureDragState();
    const markerState = createSignatureMarkerState();
    markerState.addMarker({ page: 1, x: 0, y: 0, size: 100 });
    dragState.start(0);
    const updateMarkersDisplay = vi.fn();

    const result = handleSignatureDragFlow({
      event: new MouseEvent('pointermove', { clientX: 60, clientY: 80 }),
      canvas: makeCanvas(),
      pdfPage: { width: 1000, height: 500 },
      aspectRatio: 2,
      dragState,
      markerState,
      getMarkerPdfPositionFromCanvas: vi.fn(() => ({
        x: 200,
        y: 300,
        canvasX: 50,
        canvasY: 60,
      })),
      updateMarkersDisplay,
    });

    expect(result.status).toBe('moved');
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
  });

  it('does not refresh markers for inactive drags', () => {
    const updateMarkersDisplay = vi.fn();

    expect(handleSignatureDragFlow({
      event: new MouseEvent('pointermove'),
      canvas: makeCanvas(),
      pdfPage: { width: 1000, height: 500 },
      aspectRatio: 1,
      dragState: createSignatureDragState(),
      markerState: createSignatureMarkerState(),
      getMarkerPdfPositionFromCanvas: vi.fn(),
      updateMarkersDisplay,
    })).toEqual({ status: 'inactive' });

    expect(updateMarkersDisplay).not.toHaveBeenCalled();
  });

  it('stops drag, clears user-select and refreshes list only after movement', () => {
    const dragState = createSignatureDragState();
    dragState.start(0);
    dragState.markMoved();
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();
    document.body.style.userSelect = 'none';

    const result = stopSignatureDragFlow({
      dragState,
      updateMarkersDisplay,
      updateSignatureList,
      bodyStyle: document.body.style,
    });

    expect(result).toEqual({ status: 'stopped', movedDuringDrag: true });
    expect(document.body.style.userSelect).toBe('');
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
    expect(updateSignatureList).toHaveBeenCalledTimes(1);
  });

  it('leaves list alone when drag stop had no movement', () => {
    const dragState = createSignatureDragState();
    dragState.start(0);
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();

    const result = stopSignatureDragFlow({
      dragState,
      updateMarkersDisplay,
      updateSignatureList,
      bodyStyle: document.body.style,
    });

    expect(result).toEqual({ status: 'stopped', movedDuringDrag: false });
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
    expect(updateSignatureList).not.toHaveBeenCalled();
  });
});
