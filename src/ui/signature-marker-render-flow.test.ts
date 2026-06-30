// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createSignatureDragState } from '../state/signature-drag';
import { createSignatureMarkerState } from '../state/signature-markers';
import { createSignatureViewerState } from '../state/signature-viewer';
import {
  clearSignatureMarkersFlow,
  renderSignatureMarkerListFlow,
  renderSignatureMarkerOverlayFlow,
  resizeSignatureMarkersFlow,
} from './signature-marker-render-flow';

function translate(english: string, _spanish: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);
}

describe('signature marker render flow', () => {
  it('renders marker overlay with drag and remove callbacks', () => {
    const container = document.createElement('div');
    const markerState = createSignatureMarkerState();
    markerState.addMarker({ page: 1, x: 10, y: 20, size: 90 });
    const dragState = createSignatureDragState();
    dragState.start(0);
    const viewerState = createSignatureViewerState();
    viewerState.load(new File(['pdf'], 'doc.pdf', { type: 'application/pdf' }), {
      numPages: 2,
      getPage: vi.fn(),
    }, 2);
    const onStartDrag = vi.fn();
    const onRemove = vi.fn();

    renderSignatureMarkerOverlayFlow({
      markerState,
      dragState,
      viewerState,
      container,
      getPosition: marker => ({ x: marker.x, y: marker.y }),
      getDimensions: marker => ({ width: marker.size, height: marker.size / 2 }),
      onStartDrag,
      onRemove,
    });

    const marker = container.querySelector<HTMLElement>('.signature-marker');
    marker?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    container.querySelector<HTMLButtonElement>('.signature-marker-delete')?.click();

    expect(container.querySelectorAll('.signature-marker')).toHaveLength(1);
    expect(marker?.classList.contains('dragging')).toBe(true);
    expect(onStartDrag).toHaveBeenCalledWith(0);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('renders marker list with translated labels', () => {
    const list = document.createElement('div');
    const markerState = createSignatureMarkerState();
    markerState.addMarker({ page: 2, x: 10.1, y: 20.9, size: 90 });
    const onRemove = vi.fn();

    renderSignatureMarkerListFlow({
      markerState,
      list,
      i18n: translate,
      onRemove,
    });

    expect(list.querySelector('.signature-item-page')?.textContent).toBe('Page 2');
    expect(list.querySelector('.signature-item-coords')?.textContent).toBe('X: 10, Y: 21');
    list.querySelector<HTMLButtonElement>('.btn-apply')?.click();
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('clears markers and refreshes dependent UI', () => {
    const markerState = createSignatureMarkerState();
    markerState.addMarker({ page: 1, x: 10, y: 20, size: 90 });
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();

    clearSignatureMarkersFlow(markerState, updateMarkersDisplay, updateSignatureList);

    expect(markerState.markers).toEqual([]);
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
    expect(updateSignatureList).toHaveBeenCalledTimes(1);
  });

  it('resizes markers, persists the size and refreshes overlay', () => {
    const markerState = createSignatureMarkerState();
    markerState.addMarker({ page: 1, x: 10, y: 20, size: 90 });
    const saveSignatureSize = vi.fn();
    const updateMarkersDisplay = vi.fn();

    const size = resizeSignatureMarkersFlow(
      markerState,
      '120',
      saveSignatureSize,
      updateMarkersDisplay,
    );

    expect(size).toBe(120);
    expect(markerState.markers[0]?.size).toBe(120);
    expect(saveSignatureSize).toHaveBeenCalledWith('120');
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
  });
});
