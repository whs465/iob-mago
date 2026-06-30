import { describe, expect, it, vi } from 'vitest';
import { createPreparedSignatureState } from './prepared-signature';

function makeCanvas() {
  return { width: 10, height: 5 } as HTMLCanvasElement;
}

function makeRuntime() {
  let index = 0;
  return {
    createObjectURL: vi.fn(() => `blob:prepared-${index++}`),
    revokeObjectURL: vi.fn(),
  };
}

describe('prepared signature state', () => {
  it('stores prepared signature data and creates a preview URL', () => {
    const state = createPreparedSignatureState();
    const urls = makeRuntime();
    const blob = new Blob(['png'], { type: 'image/png' });

    const previewUrl = state.setPrepared({
      canvas: makeCanvas(),
      blob,
      fileName: 'firma.png',
      width: 10,
      height: 5,
    }, urls);

    expect(previewUrl).toBe('blob:prepared-0');
    expect(state.blob).toBe(blob);
    expect(state.fileName).toBe('firma.png');
    expect(state.previewUrl).toBe('blob:prepared-0');
    expect(state.hasPreparedSignature).toBe(true);
  });

  it('revokes the previous preview URL when blob changes', () => {
    const state = createPreparedSignatureState();
    const urls = makeRuntime();

    state.setPrepared({
      canvas: makeCanvas(),
      blob: new Blob(['one']),
      fileName: 'firma.png',
      width: 10,
      height: 5,
    }, urls);
    const previewUrl = state.updateBlob(new Blob(['two']), urls);

    expect(previewUrl).toBe('blob:prepared-1');
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:prepared-0');
  });

  it('clears prepared data and revokes the current preview URL on reset', () => {
    const state = createPreparedSignatureState();
    const urls = makeRuntime();

    state.setPrepared({
      canvas: makeCanvas(),
      blob: new Blob(['png']),
      fileName: 'firma.png',
      width: 10,
      height: 5,
    }, urls);
    state.reset(urls);

    expect(state.blob).toBeNull();
    expect(state.fileName).toBe('');
    expect(state.canvas).toBeNull();
    expect(state.previewUrl).toBeNull();
    expect(state.hasPreparedSignature).toBe(false);
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:prepared-0');
  });
});
