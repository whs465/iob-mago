// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compressPdfFlow } from './compress-pdf-flow';

const i18n = (_en: string, es: string, vars: Record<string, string> = {}) =>
  Object.entries(vars).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), es);

describe('compressPdfFlow', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="compress-status"></p>';
  });

  it('downloads a successful result and reports the reduction', async () => {
    const saveAs = vi.fn();
    const showStatus = vi.fn();
    const result = await compressPdfFlow({
      file: new File([new Uint8Array(100)], 'report.pdf'), mode: 'safe', deps: {} as never,
      i18n, showStatus, setActionBusy: () => vi.fn(), saveAs,
      compressAction: vi.fn(async () => ({
        pdfBytes: new Uint8Array(60), originalSize: 100, outputSize: 60,
        mode: 'safe' as const, rasterized: false, keptOriginal: false, attempts: 1,
      })),
    });
    expect(result.status).toBe('success');
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'report-comprimido-seguro.pdf');
    expect(showStatus).toHaveBeenLastCalledWith(expect.stringContaining('40% menos'), 'success');
    expect(document.getElementById('compress-status')?.classList.contains('tool-status-success')).toBe(true);
  });

  it('does not download an identical original when no mode can reduce it', async () => {
    const saveAs = vi.fn();
    const showStatus = vi.fn();
    const result = await compressPdfFlow({
      file: new File([new Uint8Array(100)], 'report.pdf'), mode: 'compact', deps: {} as never,
      i18n, showStatus, setActionBusy: () => vi.fn(), saveAs,
      compressAction: vi.fn(async () => ({
        pdfBytes: new Uint8Array(100), originalSize: 100, outputSize: 100,
        mode: 'compact' as const, rasterized: true, keptOriginal: true, attempts: 3,
      })),
    });

    expect(result.status).toBe('no-reduction');
    expect(saveAs).not.toHaveBeenCalled();
    expect(showStatus).toHaveBeenLastCalledWith(expect.stringContaining('No se descargó una copia idéntica'), 'error');
  });

  it('renders a visible inline error and always restores the button', async () => {
    const showStatus = vi.fn();
    const finish = vi.fn();
    const logError = vi.fn();
    const result = await compressPdfFlow({
      file: new File(['broken'], 'broken.pdf'), mode: 'balanced', deps: {} as never,
      i18n, showStatus, setActionBusy: () => finish, saveAs: vi.fn(), logError,
      compressAction: vi.fn(async () => { throw new Error('PDF dañado'); }),
    });

    expect(result).toEqual({ status: 'error', message: 'PDF dañado' });
    expect(finish).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledOnce();
    expect(document.getElementById('compress-status')?.textContent).toContain('PDF dañado');
    expect(document.getElementById('compress-status')?.getAttribute('role')).toBe('alert');
  });
});
