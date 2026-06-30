// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createSignatureGeneratorState } from '../state/signature-generator';
import { generatePreparedSignaturePng } from './signature-generation-action';

function makeFile(name = 'signature.jpg') {
  return new File(['image'], name, { type: 'image/jpeg' });
}

function makePrepared() {
  const canvas = document.createElement('canvas');
  return {
    canvas,
    blob: new Blob(['png'], { type: 'image/png' }),
    fileName: 'signature-firma.png',
    width: 20,
    height: 10,
  };
}

function makeOptions(state = createSignatureGeneratorState()) {
  return {
    state,
    sensitivity: '62',
    trim: true,
    color: { r: 1, g: 2, b: 3 },
    imageLoadErrorMessage: 'load failed',
    noSignatureMessage: 'no signature',
    pngCreationErrorMessage: 'png failed',
  };
}

describe('generatePreparedSignaturePng', () => {
  it('reports missing source files without starting generation', async () => {
    const state = createSignatureGeneratorState();
    const prepareSignaturePng = vi.fn();

    const result = await generatePreparedSignaturePng({
      ...makeOptions(state),
      prepareSignaturePng,
    });

    expect(result).toEqual({ status: 'missing-source' });
    expect(state.isGenerating).toBe(false);
    expect(prepareSignaturePng).not.toHaveBeenCalled();
  });

  it('queues regeneration when generation is already running', async () => {
    const state = createSignatureGeneratorState();
    state.setSourceFile(makeFile());
    state.beginGeneration();

    const result = await generatePreparedSignaturePng(makeOptions(state));

    expect(result).toEqual({ status: 'queued' });
    expect(state.regenerateQueued).toBe(true);
  });

  it('prepares a signature PNG and resets generation state', async () => {
    const state = createSignatureGeneratorState();
    state.setSourceFile(makeFile());
    const prepared = makePrepared();
    const prepareSignaturePng = vi.fn(async () => prepared);
    const onGenerationStarted = vi.fn();
    const onGenerationFinished = vi.fn();

    const result = await generatePreparedSignaturePng({
      ...makeOptions(state),
      prepareSignaturePng,
      onGenerationStarted,
      onGenerationFinished,
    });

    expect(result).toEqual({ status: 'ok', prepared });
    expect(prepareSignaturePng).toHaveBeenCalledWith({
      sourceFile: state.sourceFile,
      sensitivity: '62',
      trim: true,
      color: { r: 1, g: 2, b: 3 },
      imageLoadErrorMessage: 'load failed',
      noSignatureMessage: 'no signature',
      pngCreationErrorMessage: 'png failed',
    });
    expect(onGenerationStarted).toHaveBeenCalledTimes(1);
    expect(onGenerationFinished).toHaveBeenCalledTimes(1);
    expect(state.isGenerating).toBe(false);
  });

  it('queues regeneration when the source changes during preparation', async () => {
    const state = createSignatureGeneratorState();
    state.setSourceFile(makeFile('old.jpg'));
    const prepareSignaturePng = vi.fn(async () => {
      state.setSourceFile(makeFile('new.jpg'));
      return makePrepared();
    });

    const result = await generatePreparedSignaturePng({
      ...makeOptions(state),
      prepareSignaturePng,
    });

    expect(result).toEqual({ status: 'stale-source' });
    expect(state.regenerateQueued).toBe(true);
    expect(state.isGenerating).toBe(false);
  });
});
