// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createPreparedSignatureState } from '../state/prepared-signature';
import { createSignatureGeneratorState } from '../state/signature-generator';
import {
  resetPreparedSignatureFlow,
  usePreparedSignatureFlow,
} from './prepared-signature-flow';

function setPreparedSignature(fileName = 'firma-generada.png') {
  const state = createPreparedSignatureState();
  state.setPrepared({
    canvas: document.createElement('canvas'),
    blob: new Blob(['png'], { type: 'image/png' }),
    fileName,
    width: 10,
    height: 5,
  }, {
    createObjectURL: () => 'blob:prepared',
    revokeObjectURL: () => undefined,
  });
  return state;
}

describe('prepared signature flow', () => {
  it('resets prepared signature state and UI', () => {
    document.body.innerHTML = `
      <img id="prepared-signature-preview" class="visible" src="blob:prepared">
      <div id="signature-preview-empty" style="display: none"></div>
      <button id="signature-download-action"></button>
      <button id="signature-use-action"></button>
      <div id="signature-generator-meta">PNG ready</div>
    `;
    const preparedState = setPreparedSignature();
    const generatorState = createSignatureGeneratorState();
    generatorState.setSourceFile(new File(['photo'], 'source.png', { type: 'image/png' }));
    const revokeObjectURL = vi.fn();

    resetPreparedSignatureFlow({
      preparedState,
      generatorState,
      urls: { revokeObjectURL },
    });

    expect(preparedState.hasPreparedSignature).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:prepared');
    expect(document.getElementById('prepared-signature-preview')?.hasAttribute('src')).toBe(false);
    expect(document.getElementById('prepared-signature-preview')?.classList.contains('visible')).toBe(false);
    expect(document.getElementById('signature-preview-empty')?.style.display).toBe('block');
    expect((document.getElementById('signature-download-action') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('signature-use-action') as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById('signature-generator-meta')?.textContent).toBe('');
  });

  it('loads the prepared PNG as the active signature', async () => {
    const preparedState = setPreparedSignature();
    const setSignatureImageFile = vi.fn<(file: File) => Promise<void>>(() => Promise.resolve());
    const showStatus = vi.fn();
    const i18n = (english: string) => english;

    const result = await usePreparedSignatureFlow({
      preparedState,
      i18n,
      showStatus,
      setSignatureImageFile,
    });

    expect(result.status).toBe('ok');
    expect(setSignatureImageFile).toHaveBeenCalledTimes(1);
    expect(setSignatureImageFile.mock.calls[0][0].name).toBe('firma-generada.png');
    expect(showStatus).toHaveBeenCalledWith('Generated PNG loaded as the active signature', 'success');
  });

  it('skips active signature loading when no prepared PNG exists', async () => {
    const preparedState = createPreparedSignatureState();
    const setSignatureImageFile = vi.fn<(file: File) => Promise<void>>(() => Promise.resolve());
    const showStatus = vi.fn();

    const result = await usePreparedSignatureFlow({
      preparedState,
      i18n: english => english,
      showStatus,
      setSignatureImageFile,
    });

    expect(result).toEqual({ status: 'missing-prepared-signature' });
    expect(setSignatureImageFile).not.toHaveBeenCalled();
    expect(showStatus).not.toHaveBeenCalled();
  });
});
