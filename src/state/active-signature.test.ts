import { describe, expect, it } from 'vitest';
import { createActiveSignatureState } from './active-signature';

describe('active signature state', () => {
  it('tracks active signature bytes and aspect ratio', () => {
    const state = createActiveSignatureState();
    const bytes = new Uint8Array([1, 2, 3]).buffer;

    expect(state.hasImage).toBe(false);
    expect(state.aspectRatio).toBe(1);

    state.setImage(bytes, 'image/png');
    state.setAspectRatio(2.5);

    expect(state.imageBytes).toBe(bytes);
    expect(state.imageType).toBe('image/png');
    expect(state.hasImage).toBe(true);
    expect(state.aspectRatio).toBe(2.5);
  });

  it('can reset aspect ratio and clear image state', () => {
    const state = createActiveSignatureState();
    state.setImage(new ArrayBuffer(1), 'image/jpeg');
    state.setAspectRatio(1.7);

    state.resetAspectRatio();
    expect(state.aspectRatio).toBe(1);
    expect(state.hasImage).toBe(true);

    state.clear();
    expect(state.imageBytes).toBeNull();
    expect(state.imageType).toBeNull();
    expect(state.aspectRatio).toBe(1);
    expect(state.hasImage).toBe(false);
  });
});
