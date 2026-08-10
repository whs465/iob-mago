// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unlockPdfFlow } from './unlock-pdf-flow';

const i18n = (_en: string, es: string, vars: Record<string, string> = {}) =>
  Object.entries(vars).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), es);

function createOptions(overrides: Record<string, unknown> = {}) {
  return {
    file: new File(['protected'], 'contrato.pdf', { type: 'application/pdf' }),
    password: 'secreto',
    buildUnlockedPdf: vi.fn(async (_buffer, _password, onProgress) => {
      onProgress?.(1, 1);
      return new Uint8Array([1, 2, 3]);
    }),
    i18n,
    showStatus: vi.fn(),
    setActionBusy: vi.fn(() => vi.fn()),
    saveAs: vi.fn(),
    logError: vi.fn(),
    ...overrides,
  } as Parameters<typeof unlockPdfFlow>[0];
}

describe('unlockPdfFlow', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="unlock-status"></p>';
  });

  it('downloads an unlocked copy without exposing the password in its name', async () => {
    const options = createOptions();
    const result = await unlockPdfFlow(options);

    expect(result).toEqual({ status: 'success', filename: 'contrato-sin-clave.pdf' });
    expect(options.buildUnlockedPdf).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      'secreto',
      expect.any(Function),
    );
    expect(options.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'contrato-sin-clave.pdf');
    expect(document.getElementById('unlock-status')?.classList).toContain('tool-status-success');
  });

  it('requires a password before starting', async () => {
    const options = createOptions({ password: '   ' });
    const result = await unlockPdfFlow(options);

    expect(result).toEqual({ status: 'missing-password' });
    expect(options.buildUnlockedPdf).not.toHaveBeenCalled();
    expect(options.showStatus).toHaveBeenLastCalledWith('Escribe la contraseña del PDF', 'error');
  });

  it('shows a clear error for an incorrect password and restores the action', async () => {
    const finish = vi.fn();
    const options = createOptions({
      buildUnlockedPdf: vi.fn(async () => {
        throw Object.assign(new Error('Incorrect Password'), { name: 'PasswordException', code: 2 });
      }),
      setActionBusy: vi.fn(() => finish),
    });
    const result = await unlockPdfFlow(options);

    expect(result).toEqual({ status: 'incorrect-password' });
    expect(options.saveAs).not.toHaveBeenCalled();
    expect(options.showStatus).toHaveBeenLastCalledWith(
      'La contraseña no es correcta. Revísala e intenta de nuevo.',
      'error',
    );
    expect(finish).toHaveBeenCalledOnce();
  });
});
