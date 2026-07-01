// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createActiveSignatureState } from './active-signature';
import { addSignatureMarkerFromClick } from './signature-marker-click-action';
import { createSignatureMarkerState } from './signature-markers';
import type { SignatureViewerState } from './signature-viewer';

function makeViewerState() {
  return {} as SignatureViewerState;
}

function makeCanvas() {
  return {} as HTMLCanvasElement;
}

describe('addSignatureMarkerFromClick', () => {
  it('requires an active signature image before adding markers', async () => {
    const markerState = createSignatureMarkerState();
    const activeSignatureState = createActiveSignatureState();
    const createMarkerFromClick = vi.fn();

    const result = await addSignatureMarkerFromClick({
      event: new MouseEvent('click'),
      canvas: makeCanvas(),
      viewerState: makeViewerState(),
      markerState,
      activeSignatureState,
      size: 120,
      createMarkerFromClick,
    });

    expect(result).toEqual({ status: 'missing-image' });
    expect(createMarkerFromClick).not.toHaveBeenCalled();
    expect(markerState.markers).toEqual([]);
  });

  it('adds the marker created from the click', async () => {
    const markerState = createSignatureMarkerState();
    const activeSignatureState = createActiveSignatureState();
    activeSignatureState.setImage(new ArrayBuffer(1), 'image/png');
    activeSignatureState.setAspectRatio(2);
    const marker = { page: 1, x: 10, y: 20, size: 120 };
    const createMarkerFromClick = vi.fn(async () => marker);

    const result = await addSignatureMarkerFromClick({
      event: new MouseEvent('click'),
      canvas: makeCanvas(),
      viewerState: makeViewerState(),
      markerState,
      activeSignatureState,
      size: 120,
      createMarkerFromClick,
    });

    expect(result).toEqual({ status: 'ok', marker });
    expect(markerState.markers).toEqual([marker]);
    expect(createMarkerFromClick).toHaveBeenCalledWith({
      event: expect.any(MouseEvent),
      canvas: expect.anything(),
      viewerState: expect.anything(),
      size: 120,
      aspectRatio: 2,
    });
  });

  it('reports when the click cannot create a marker', async () => {
    const markerState = createSignatureMarkerState();
    const activeSignatureState = createActiveSignatureState();
    activeSignatureState.setImage(new ArrayBuffer(1), 'image/png');

    const result = await addSignatureMarkerFromClick({
      event: new MouseEvent('click'),
      canvas: makeCanvas(),
      viewerState: makeViewerState(),
      markerState,
      activeSignatureState,
      size: 120,
      createMarkerFromClick: vi.fn(async () => null),
    });

    expect(result).toEqual({ status: 'no-marker' });
    expect(markerState.markers).toEqual([]);
  });
});
