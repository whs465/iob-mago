// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawPolishedScreenshot, getScaledScreenshotSize, setupScreenshotPolish } from './screenshot-polish';

const i18n = (_en: string, es: string, vars: Record<string, string> = {}) =>
  Object.entries(vars).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), es);

function mockCanvasContext() {
  return {
    clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(),
    closePath: vi.fn(), fill: vi.fn(), clip: vi.fn(), drawImage: vi.fn(), stroke: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 0, shadowColor: '', shadowBlur: 0, shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
}

function renderFixture() {
  document.body.innerHTML = `
    <div id="screenshot-paste-zone"></div>
    <input id="screenshot-input" type="file">
    <canvas id="screenshot-canvas" hidden></canvas>
    <div id="screenshot-preview-empty"></div>
    <p id="screenshot-status"></p>
    <button id="screenshot-copy-action" disabled></button>
    <button id="screenshot-download-action" disabled></button>
    <select id="screenshot-radius"><option value="14" selected></option></select>
    <select id="screenshot-shadow"><option value="soft" selected></option></select>
    <select id="screenshot-padding"><option value="36" selected></option></select>
    <select id="screenshot-background"><option value="transparent" selected></option></select>
    <select id="screenshot-format"><option value="png" selected>PNG</option><option value="pdf">PDF</option></select>
  `;
}

describe('screenshot polish', () => {
  afterEach(() => vi.restoreAllMocks());

  it('scales only images larger than the safe canvas edge', () => {
    expect(getScaledScreenshotSize(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(getScaledScreenshotSize(6000, 3000)).toEqual({ width: 4096, height: 2048 });
  });

  it('adds padding and draws the image inside a rounded frame', () => {
    const canvas = document.createElement('canvas');
    const context = mockCanvasContext();
    vi.spyOn(canvas, 'getContext').mockReturnValue(context);
    const result = drawPolishedScreenshot(canvas, { width: 1000, height: 500 } as never, {
      radius: 14, padding: 36, shadow: 'soft', background: 'transparent',
    });

    expect(result).toEqual({ width: 1072, height: 572 });
    expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 36, 36, 1000, 500);
    expect(context.stroke).toHaveBeenCalledOnce();
  });

  it('loads a pasted image and allows copying or downloading the polished PNG', async () => {
    renderFixture();
    const context = mockCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
    const saveAs = vi.fn();
    const copyBlob = vi.fn(async () => undefined);
    const createPdf = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const cleanup = setupScreenshotPolish({
      i18n,
      saveAs,
      copyBlob,
      createPdf,
      decodeImage: vi.fn(async () => ({ width: 800, height: 500 } as never)),
    });
    const file = new File(['image'], 'captura.png', { type: 'image/png' });
    const paste = new Event('paste', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(paste, 'clipboardData', {
      value: { items: [{ type: 'image/png', getAsFile: () => file }] },
    });

    document.dispatchEvent(paste);
    await vi.waitFor(() => expect(
      (document.getElementById('screenshot-download-action') as HTMLButtonElement).disabled,
    ).toBe(false));
    document.getElementById('screenshot-copy-action')?.click();
    await vi.waitFor(() => expect(copyBlob).toHaveBeenCalledWith(expect.any(Blob)));
    expect(document.getElementById('screenshot-status')?.textContent).toBe(
      'Imagen copiada · pégala donde la necesites',
    );
    document.getElementById('screenshot-download-action')?.click();
    await vi.waitFor(() => expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'captura-pro.png'));
    const format = document.getElementById('screenshot-format') as HTMLSelectElement;
    format.value = 'pdf';
    format.dispatchEvent(new Event('change'));
    expect(document.getElementById('screenshot-download-action')?.textContent).toBe('Descargar PDF');
    document.getElementById('screenshot-download-action')?.click();
    await vi.waitFor(() => expect(createPdf).toHaveBeenCalledWith(expect.any(Blob)));
    expect(saveAs).toHaveBeenLastCalledWith(expect.any(Blob), 'captura-pro.pdf');
    cleanup();
  });
});
