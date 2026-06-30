import { describe, expect, it, vi } from 'vitest';
import { createSignatureGeneratorState } from './signature-generator';

function makeFile(name = 'signature.jpg') {
  return new File(['image'], name, { type: 'image/jpeg' });
}

describe('signature generator state', () => {
  it('tracks source files and versions', () => {
    const state = createSignatureGeneratorState();

    expect(state.sourceFile).toBeNull();
    expect(state.sourceVersion).toBe(0);

    const file = makeFile();
    state.setSourceFile(file);

    expect(state.sourceFile).toBe(file);
    expect(state.sourceVersion).toBe(1);
    expect(state.canAdjustSourceImage).toBe(true);
  });

  it('tracks generation and queued regeneration', () => {
    const state = createSignatureGeneratorState();

    expect(state.beginGeneration()).toBe(true);
    expect(state.isGenerating).toBe(true);
    expect(state.canAdjustSourceImage).toBe(false);

    expect(state.beginGeneration()).toBe(false);
    expect(state.regenerateQueued).toBe(true);
    expect(state.consumeQueuedRegeneration()).toBe(true);
    expect(state.consumeQueuedRegeneration()).toBe(false);

    state.finishGeneration();
    expect(state.isGenerating).toBe(false);
  });

  it('clears managed timers on reset', () => {
    vi.useFakeTimers();
    const state = createSignatureGeneratorState();
    const recolor = vi.fn();
    const regenerate = vi.fn();

    state.setRecolorTimer(setTimeout(recolor, 10));
    state.setRegenerateTimer(setTimeout(regenerate, 10));
    state.queueRegeneration();
    state.reset();
    vi.runAllTimers();

    expect(recolor).not.toHaveBeenCalled();
    expect(regenerate).not.toHaveBeenCalled();
    expect(state.regenerateQueued).toBe(false);
    vi.useRealTimers();
  });
});
