import { describe, expect, it } from 'vitest';
import { createSignatureMarkerState } from './signature-markers';

describe('signature marker state', () => {
  it('adds, reads and clears markers', () => {
    const state = createSignatureMarkerState();
    const marker = { page: 1, x: 100, y: 200, size: 120, canvasX: 50, canvasY: 60 };

    state.addMarker(marker);

    expect(state.hasMarkers()).toBe(true);
    expect(state.getFirstMarker()).toEqual(marker);
    expect(state.getMarker(0)).toEqual(marker);

    state.clear();

    expect(state.markers).toEqual([]);
    expect(state.hasMarkers()).toBe(false);
  });

  it('removes markers only for valid indexes', () => {
    const state = createSignatureMarkerState();
    state.addMarker({ page: 1, x: 10, y: 20, size: 80 });
    state.addMarker({ page: 2, x: 30, y: 40, size: 90 });

    expect(state.removeMarker(0)).toBe(true);
    expect(state.markers).toEqual([{ page: 2, x: 30, y: 40, size: 90 }]);
    expect(state.removeMarker(4)).toBe(false);
    expect(state.removeMarker(null)).toBe(false);
  });

  it('updates marker sizes immutably', () => {
    const state = createSignatureMarkerState();
    const marker = { page: 1, x: 10, y: 20, size: 80 };
    state.addMarker(marker);

    state.setAllSizes(140);

    expect(state.markers).toEqual([{ page: 1, x: 10, y: 20, size: 140 }]);
    expect(marker.size).toBe(80);
  });
});
