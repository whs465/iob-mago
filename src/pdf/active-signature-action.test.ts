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
      loadStoredSignatureImage: () => ({
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
    expect(saveSignatureImageFile).toHaveBeenCalledWith(file);
  });
});
