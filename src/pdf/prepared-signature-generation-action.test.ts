// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createPreparedSignatureState } from '../state/prepared-signature';
import { createSignatureGeneratorState } from '../state/signature-generator';
import { generateStoredPreparedSignaturePng } from './prepared-signature-generation-action';

function makeUrls() {
  return {
    createObjectURL: vi.fn(() => 'blob:prepared'),
    revokeObjectURL: vi.fn(),
  };
}

function makeOptions() {
  return {
    generatorState: createSignatureGeneratorState(),
    preparedState: createPreparedSignatureState(),
    urls: makeUrls(),
    sensitivity: '70',
    trim: true,
    color: { r: 1, g: 2, b: 3 },
    imageLoadErrorMessage: 'load failed',
    noSignatureMessage: 'no signature',
    pngCreationErrorMessage: 'png failed',
  };
}

describe('generateStoredPreparedSignaturePng', () => {
  it('passes through non-ok generation results without storing prepared data', async () => {
    const options = makeOptions();
    const generatePreparedSignature = vi.fn(async () => ({ status: 'missing-source' as const }));

    const result = await generateStoredPreparedSignaturePng({
      ...options,
      generatePreparedSignature,
    });

    expect(result).toEqual({ status: 'missing-source' });
    expect(options.preparedState.hasPreparedSignature).toBe(false);
    expect(options.urls.createObjectURL).not.toHaveBeenCalled();
  });

  it('stores prepared data and returns preview details after a successful generation', async () => {
    const options = makeOptions();
    const canvas = document.createElement('canvas');
    const blob = new Blob(['png'], { type: 'image/png' });
    const generatePreparedSignature = vi.fn(async () => ({
      status: 'ok' as const,
      prepared: {
        canvas,
        blob,
        fileName: 'firma.png',
        width: 40,
        height: 12,
      },
    }));

    const result = await generateStoredPreparedSignaturePng({
      ...options,
      generatePreparedSignature,
    });

    expect(result).toEqual({
      status: 'ok',
      previewUrl: 'blob:prepared',
      width: 40,
      height: 12,
    });
    expect(options.preparedState.blob).toBe(blob);
    expect(options.preparedState.canvas).toBe(canvas);
    expect(options.preparedState.fileName).toBe('firma.png');
    expect(generatePreparedSignature).toHaveBeenCalledWith(expect.objectContaining({
      state: options.generatorState,
      sensitivity: '70',
      trim: true,
      color: { r: 1, g: 2, b: 3 },
    }));
  });
});
