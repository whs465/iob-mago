import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreparedSignatureState } from './prepared-signature';
import { createSignatureGeneratorState } from './signature-generator';
import {
  schedulePreparedSignatureRecolorAction,
  schedulePreparedSignatureRegenerateAction,
} from './signature-generation-schedule-action';

function makeFile(name = 'signature.jpg') {
  return new File(['image'], name, { type: 'image/jpeg' });
}

function makePreparedStateWithBlob() {
  const state = createPreparedSignatureState();
  const canvas = { width: 10, height: 5 } as HTMLCanvasElement;
  state.setPrepared({
    blob: new Blob(['png'], { type: 'image/png' }),
    canvas,
    fileName: 'signature.png',
    width: 10,
    height: 5,
  }, URL);
  return state;
}

describe('signature generation schedule actions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips recolor until a prepared signature exists', () => {
    vi.useFakeTimers();
    const result = schedulePreparedSignatureRecolorAction({
      generatorState: createSignatureGeneratorState(),
      preparedState: createPreparedSignatureState(),
      onRecolor: vi.fn(),
    });

    expect(result).toEqual({ status: 'skipped' });
  });

  it('schedules recolor and clears the timer before running', () => {
    vi.useFakeTimers();
    const generatorState = createSignatureGeneratorState();
    const onRecolor = vi.fn(() => {
      generatorState.reset();
    });

    const result = schedulePreparedSignatureRecolorAction({
      generatorState,
      preparedState: makePreparedStateWithBlob(),
      delayMs: 20,
      onRecolor,
    });

    expect(result).toEqual({ status: 'scheduled' });
    vi.advanceTimersByTime(20);
    expect(onRecolor).toHaveBeenCalledOnce();
  });

  it('requires a source file before scheduling regeneration', () => {
    vi.useFakeTimers();
    const result = schedulePreparedSignatureRegenerateAction({
      generatorState: createSignatureGeneratorState(),
      preparedState: makePreparedStateWithBlob(),
      onRegenerate: vi.fn(),
    });

    expect(result).toEqual({ status: 'skipped' });
  });

  it('allows forced regeneration without an existing prepared signature', () => {
    vi.useFakeTimers();
    const generatorState = createSignatureGeneratorState();
    const onRegenerate = vi.fn();
    generatorState.setSourceFile(makeFile());

    const result = schedulePreparedSignatureRegenerateAction({
      generatorState,
      preparedState: createPreparedSignatureState(),
      force: true,
      delayMs: 30,
      onRegenerate,
    });

    expect(result).toEqual({ status: 'scheduled' });
    vi.advanceTimersByTime(30);
    expect(onRegenerate).toHaveBeenCalledOnce();
  });
});
