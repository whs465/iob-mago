import { describe, expect, it, vi } from 'vitest';
import { createActiveSignatureState } from '../state/active-signature';
import { createSignatureMarkerState } from '../state/signature-markers';
import { createSignatureViewerState } from '../state/signature-viewer';
import {
  handleSignatureCanvasClickFlow,
  removeSignatureMarkerFlow,
} from './signature-marker-flow';

function translate(english: string) {
  return english;
}

describe('signature marker flow', () => {
  it('shows an error when trying to place a marker without a signature image', async () => {
    const showStatus = vi.fn();
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();

    const result = await handleSignatureCanvasClickFlow({
      event: {} as MouseEvent,
      canvas: {} as HTMLCanvasElement,
      viewerState: createSignatureViewerState(),
      markerState: createSignatureMarkerState(),
      activeSignatureState: createActiveSignatureState(),
      size: 90,
      i18n: translate,
      showStatus,
      createMarkerFromClick: vi.fn(),
      updateMarkersDisplay,
      updateSignatureList,
    });

    expect(result).toEqual({ status: 'missing-image' });
    expect(showStatus).toHaveBeenCalledWith('Upload a signature image first', 'error');
    expect(updateMarkersDisplay).not.toHaveBeenCalled();
    expect(updateSignatureList).not.toHaveBeenCalled();
  });

  it('refreshes marker UI after placing a new marker', async () => {
    const activeSignatureState = createActiveSignatureState();
    activeSignatureState.setImage(new ArrayBuffer(4), 'image/png');
    activeSignatureState.setAspectRatio(2);
    const markerState = createSignatureMarkerState();
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();
    const marker = { page: 1, x: 10, y: 20, size: 90 };

    const result = await handleSignatureCanvasClickFlow({
      event: {} as MouseEvent,
      canvas: {} as HTMLCanvasElement,
      viewerState: createSignatureViewerState(),
      markerState,
      activeSignatureState,
      size: 90,
      i18n: translate,
      showStatus: vi.fn(),
      createMarkerFromClick: vi.fn(async () => marker),
      updateMarkersDisplay,
      updateSignatureList,
    });

    expect(result).toEqual({ status: 'ok', marker });
    expect(markerState.markers).toEqual([marker]);
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
    expect(updateSignatureList).toHaveBeenCalledTimes(1);
  });

  it('does not refresh UI when the click produces no marker', async () => {
    const activeSignatureState = createActiveSignatureState();
    activeSignatureState.setImage(new ArrayBuffer(4), 'image/png');

    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();

    const result = await handleSignatureCanvasClickFlow({
      event: {} as MouseEvent,
      canvas: {} as HTMLCanvasElement,
      viewerState: createSignatureViewerState(),
      markerState: createSignatureMarkerState(),
      activeSignatureState,
      size: 90,
      i18n: translate,
      showStatus: vi.fn(),
      createMarkerFromClick: vi.fn(async () => null),
      updateMarkersDisplay,
      updateSignatureList,
    });

    expect(result).toEqual({ status: 'no-marker' });
    expect(updateMarkersDisplay).not.toHaveBeenCalled();
    expect(updateSignatureList).not.toHaveBeenCalled();
  });

  it('removes a marker and refreshes the UI when the index exists', () => {
    const markerState = createSignatureMarkerState();
    markerState.addMarker({ page: 1, x: 10, y: 20, size: 90 });
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();

    expect(removeSignatureMarkerFlow({
      markerState,
      index: 0,
      updateMarkersDisplay,
      updateSignatureList,
    })).toBe(true);

    expect(markerState.markers).toEqual([]);
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
    expect(updateSignatureList).toHaveBeenCalledTimes(1);
  });

  it('skips UI refresh when the marker index does not exist', () => {
    const markerState = createSignatureMarkerState();
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();

    expect(removeSignatureMarkerFlow({
      markerState,
      index: 99,
      updateMarkersDisplay,
      updateSignatureList,
    })).toBe(false);

    expect(updateMarkersDisplay).not.toHaveBeenCalled();
    expect(updateSignatureList).not.toHaveBeenCalled();
  });
});
