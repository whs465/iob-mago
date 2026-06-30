// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { prepareSignaturePng } from './signature-preparation';

function makeFile(name = 'firma-original.jpg') {
  return new File(['image'], name, { type: 'image/jpeg' });
}

describe('prepareSignaturePng', () => {
  it('loads the source image, prepares the signature, and returns PNG metadata', async () => {
    const canvas = document.createElement('canvas');
    const blob = new Blob(['png'], { type: 'image/png' });
    const image = new Image();
    const deps = {
      loadImageElementFromFile: vi.fn(async () => image),
      buildPreparedSignature: vi.fn(() => ({
        canvas,
        width: 320,
        height: 120,
        keptPixels: 42,
      })),
      canvasToPngBlob: vi.fn(async () => blob),
    };

    const result = await prepareSignaturePng({
      sourceFile: makeFile(),
      sensitivity: '62',
      trim: true,
      color: { r: 1, g: 2, b: 3 },
      imageLoadErrorMessage: 'load failed',
      noSignatureMessage: 'no signature',
      pngCreationErrorMessage: 'png failed',
      deps,
    });

    expect(deps.loadImageElementFromFile).toHaveBeenCalledWith(expect.any(File), 'load failed');
    expect(deps.buildPreparedSignature).toHaveBeenCalledWith(image, {
      sensitivity: '62',
      trim: true,
      color: { r: 1, g: 2, b: 3 },
      noSignatureMessage: 'no signature',
    });
    expect(deps.canvasToPngBlob).toHaveBeenCalledWith(canvas, 'png failed');
    expect(result).toEqual({
      canvas,
      blob,
      fileName: 'firma-original-firma.png',
      width: 320,
      height: 120,
    });
  });

  it('uses a fallback basename for unnamed files', async () => {
    const canvas = document.createElement('canvas');
    const result = await prepareSignaturePng({
      sourceFile: makeFile(''),
      sensitivity: '58',
      trim: false,
      color: { r: 0, g: 0, b: 0 },
      imageLoadErrorMessage: 'load failed',
      noSignatureMessage: 'no signature',
      pngCreationErrorMessage: 'png failed',
      deps: {
        loadImageElementFromFile: vi.fn(async () => new Image()),
        buildPreparedSignature: vi.fn(() => ({
          canvas,
          width: 1,
          height: 1,
          keptPixels: 1,
        })),
        canvasToPngBlob: vi.fn(async () => new Blob(['png'])),
      },
    });

    expect(result.fileName).toBe('firma-firma.png');
  });
});
