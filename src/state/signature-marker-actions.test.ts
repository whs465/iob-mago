import { describe, expect, it, vi } from 'vitest';
import {
  clearSignatureMarkers,
  removeSignatureMarker,
  resizeSignatureMarkers,
} from './signature-marker-actions';
import { createSignatureMarkerState } from './signature-markers';

describe('signature marker actions', () => {
  it('removes a marker by index', () => {
    const state = createSignatureMarkerState();
    state.addMarker({ page: 1, x: 10, y: 20, size: 80 });

    expect(removeSignatureMarker(state, 0)).toBe(true);
    expect(state.markers).toEqual([]);
  });

  it('clears markers and reports whether anything changed', () => {
    const state = createSignatureMarkerState();

    expect(clearSignatureMarkers(state)).toBe(false);

    state.addMarker({ page: 1, x: 10, y: 20, size: 80 });

    expect(clearSignatureMarkers(state)).toBe(true);
    expect(state.markers).toEqual([]);
  });

  it('resizes all markers and persists the selected size', () => {
    const state = createSignatureMarkerState();
    const saveSize = vi.fn();
    state.addMarker({ page: 1, x: 10, y: 20, size: 80 });
    state.addMarker({ page: 2, x: 30, y: 40, size: 90 });

    const size = resizeSignatureMarkers(state, '112', saveSize);

    expect(size).toBe(112);
    expect(state.markers.map(marker => marker.size)).toEqual([112, 112]);
    expect(saveSize).toHaveBeenCalledWith('112');
  });
});
