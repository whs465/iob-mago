import { describe, expect, it, vi } from 'vitest';
import { createActiveSignatureState } from '../state/active-signature';
import { restoreActiveSignatureFromStorage, setActiveSignatureFromFile } from './active-signature-action';

function makeFile() {
  return new File(['image'], 'signature.png', { type: 'image/png' });
}

describe('active signature actions', () => {
  it('restores a stored active signature into state', () => {
    const state = createActiveSignatureState();
    const bytes = new Uint8Array([1, 2, 3]).buffer;

    const result = restoreActiveSignatureFromStorage(state, {
      loadStoredSignatureImage: (_slot) => ({
        dataUrl: 'data:image/png;base64,abc',
        name: 'stored.png',
        bytes,
        mimeType: 'image/png',
      }),
    });

    expect(result).toEqual({
      status: 'ok',
      previewSrc: 'data:image/png;base64,abc',
      label: 'stored.png',
      isObjectUrl: false,
    });
    expect(state.imageBytes).toBe(bytes);
    expect(state.imageType).toBe('image/png');
  });

  it('restores from the active slot', () => {
    const state = createActiveSignatureState();
    state.setSlot(2);
    const bytes = new Uint8Array([4, 5, 6]).buffer;
    const loadFn = vi.fn((slot: 1 | 2) =>
      slot === 2 ? {
        dataUrl: 'data:image/png;base64,slot2',
        name: 'slot2.png',
        bytes,
        mimeType: 'image/png',
      } : null
    );

    const result = restoreActiveSignatureFromStorage(state, {
      loadStoredSignatureImage: loadFn,
    });

    expect(loadFn).toHaveBeenCalledWith(2);
    expect(result.status).toBe('ok');
    expect(state.imageBytes).toBe(bytes);
  });

  it('reports missing stored active signatures', () => {
    const state = createActiveSignatureState();

    expect(restoreActiveSignatureFromStorage(state, {
      loadStoredSignatureImage: () => null,
    })).toEqual({ status: 'missing-signature' });
    expect(state.imageBytes).toBeNull();
    expect(state.imageType).toBeNull();
  });

  it('loads a selected active signature file and starts persistence', async () => {
    const state = createActiveSignatureState();
    const file = makeFile();
    const saveSignatureImageFile = vi.fn(async () => undefined);

    const result = await setActiveSignatureFromFile(state, file, {
      saveSignatureImageFile,
      urls: { createObjectURL: vi.fn(() => 'blob:signature') },
    });

    expect(result).toEqual({
      status: 'ok',
      previewSrc: 'blob:signature',
      label: 'signature.png',
      isObjectUrl: true,
    });
    expect(state.imageBytes).toEqual(await file.arrayBuffer());
    expect(state.imageType).toBe('image/png');
    expect(saveSignatureImageFile).toHaveBeenCalledWith(file, 1);
  });

  it('persists to the active slot', async () => {
    const state = createActiveSignatureState();
    state.setSlot(2);
    const file = makeFile();
    const saveSignatureImageFile = vi.fn(async () => undefined);

    await setActiveSignatureFromFile(state, file, {
      saveSignatureImageFile,
      urls: { createObjectURL: vi.fn(() => 'blob:signature') },
    });

    expect(saveSignatureImageFile).toHaveBeenCalledWith(file, 2);
  });
});
