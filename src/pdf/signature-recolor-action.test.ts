// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createPreparedSignatureState } from '../state/prepared-signature';
import { recolorPreparedSignaturePng } from './signature-recolor-action';

function makeUrls() {
  let index = 0;
  return {
    createObjectURL: vi.fn(() => `blob:prepared-${index++}`),
    revokeObjectURL: vi.fn(),
  };
}

describe('recolorPreparedSignaturePng', () => {
  it('returns missing-canvas when there is no prepared canvas', async () => {
    const state = createPreparedSignatureState();
    const recolorCanvasPixels = vi.fn();

    const result = await recolorPreparedSignaturePng({
      state,
      color: { r: 1, g: 2, b: 3 },
      pngCreationErrorMessage: 'png failed',
      urls: makeUrls(),
      deps: { recolorCanvasPixels },
    });

    expect(result).toEqual({ status: 'missing-canvas' });
    expect(recolorCanvasPixels).not.toHaveBeenCalled();
  });

  it('recolors the prepared canvas and updates the preview blob', async () => {
    const state = createPreparedSignatureState();
    const urls = makeUrls();
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 10;
    state.setPrepared({
      canvas,
      blob: new Blob(['old'], { type: 'image/png' }),
      fileName: 'firma.png',
      width: 20,
      height: 10,
    }, urls);
    const nextBlob = new Blob(['new'], { type: 'image/png' });
    const recolorCanvasPixels = vi.fn();
    const canvasToPngBlob = vi.fn(async () => nextBlob);

    const result = await recolorPreparedSignaturePng({
      state,
      color: { r: 17, g: 24, b: 39 },
      pngCreationErrorMessage: 'png failed',
      urls,
      deps: { recolorCanvasPixels, canvasToPngBlob },
    });

    expect(result).toEqual({
      status: 'ok',
      previewUrl: 'blob:prepared-1',
      width: 20,
      height: 10,
    });
    expect(recolorCanvasPixels).toHaveBeenCalledWith(canvas, { r: 17, g: 24, b: 39 });
    expect(canvasToPngBlob).toHaveBeenCalledWith(canvas, 'png failed');
    expect(state.blob).toBe(nextBlob);
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:prepared-0');
  });
});
