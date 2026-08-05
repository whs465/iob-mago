// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createActiveSignatureState } from '../state/active-signature';
import { createSignaturePreviewState } from '../state/signature-preview';
import {
  restoreStoredActiveSignature,
  setActiveSignatureImageFileFlow,
} from './active-signature-flow';

function renderPreviewDom() {
  document.body.innerHTML = `
    <label id="sign-image-label"><input id="sign-image-file" type="file"></label>
    <img id="signature-preview">
  `;
}

function createFlowOptions() {
  const activeState = createActiveSignatureState();
  const previewState = createSignaturePreviewState();
  return {
    activeState,
    previewState,
    urls: {
      createObjectURL: vi.fn(() => 'blob:signature'),
      revokeObjectURL: vi.fn(),
    },
    i18n: (english: string) => english,
    loadSignatureAspectRatio: vi.fn(async () => 2),
    updateMarkersDisplay: vi.fn(),
  };
}

describe('active signature flow', () => {
  it('restores a stored signature and updates preview UI', async () => {
    renderPreviewDom();
    const options = createFlowOptions();
    const bytes = new Uint8Array([1, 2, 3]).buffer;

    const result = await restoreStoredActiveSignature({
      ...options,
      loadStoredSignatureImage: (_slot) => ({
        dataUrl: 'data:image/png;base64,abc',
        name: 'stored.png',
        bytes,
        mimeType: 'image/png',
      }),
    });

    expect(result.status).toBe('ok');
    expect(options.activeState.imageBytes).toBe(bytes);
    expect(options.activeState.imageType).toBe('image/png');
    expect(options.activeState.aspectRatio).toBe(2);
    expect(options.previewState.objectUrl).toBe('data:image/png;base64,abc');
    expect((document.getElementById('signature-preview') as HTMLImageElement).src).toBe('data:image/png;base64,abc');
    expect(document.getElementById('signature-preview')?.classList.contains('visible')).toBe(true);
    expect(document.getElementById('sign-image-label')?.textContent).toBe('stored.png');
    expect(options.updateMarkersDisplay).toHaveBeenCalledTimes(1);
  });

  it('loads a signature file, tracks its object URL and persists it to the active slot', async () => {
    renderPreviewDom();
    const options = createFlowOptions();
    const saveSignatureImageFile = vi.fn(async () => undefined);
    const file = new File(['image'], 'signature.png', { type: 'image/png' });

    const result = await setActiveSignatureImageFileFlow(file, {
      ...options,
      saveSignatureImageFile,
    });

    expect(result.status).toBe('ok');
    expect(options.urls.createObjectURL).toHaveBeenCalledWith(file);
    expect(options.previewState.objectUrl).toBe('blob:signature');
    expect(saveSignatureImageFile).toHaveBeenCalledWith(file, 1);
    expect(options.activeState.imageType).toBe('image/png');
    expect(document.getElementById('sign-image-label')?.textContent).toBe('signature.png');
  });

  it('resets aspect ratio when preview image metrics cannot be loaded', async () => {
    renderPreviewDom();
    const options = createFlowOptions();
    options.activeState.setAspectRatio(3);
    options.loadSignatureAspectRatio.mockRejectedValueOnce(new Error('bad image'));

    await restoreStoredActiveSignature({
      ...options,
      loadStoredSignatureImage: (_slot) => ({
        dataUrl: 'data:image/png;base64,abc',
        name: 'stored.png',
        bytes: new ArrayBuffer(1),
        mimeType: 'image/png',
      }),
    });

    expect(options.activeState.aspectRatio).toBe(1);
    expect(options.updateMarkersDisplay).toHaveBeenCalledTimes(1);
  });

  it('skips UI updates when no stored signature exists', async () => {
    renderPreviewDom();
    const options = createFlowOptions();

    const result = await restoreStoredActiveSignature({
      ...options,
      loadStoredSignatureImage: () => null,
    });

    expect(result).toEqual({ status: 'missing-signature' });
    expect(options.updateMarkersDisplay).not.toHaveBeenCalled();
    expect(document.getElementById('signature-preview')?.classList.contains('visible')).toBe(false);
  });
});
