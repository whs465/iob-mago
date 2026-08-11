// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawScannedImage, getRotatedImageSize, setupScanToPdf } from './scan-to-pdf';

const i18n = (_en: string, es: string, vars: Record<string, string> = {}) =>
  Object.entries(vars).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), es);

function canvasContext() {
  return {
    fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    drawImage: vi.fn(), fillStyle: '', filter: '',
  } as unknown as CanvasRenderingContext2D;
}

function fixture() {
  document.body.innerHTML = `
    <div class="image-tool-tabs">
      <button data-image-tool="screenshot"></button>
      <button data-image-tool="scan"></button>
    </div>
    <section data-image-tool-panel="screenshot"></section>
    <section id="scan-tool-panel" data-image-tool-panel="scan" hidden>
      <div id="scan-drop-zone"></div>
      <input id="scan-image-input" type="file" multiple>
      <input id="scan-camera-input" type="file">
      <div id="scan-page-list"></div>
      <div id="scan-empty"></div>
      <p id="scan-status"></p>
      <select id="scan-finish"><option value="document" selected></option></select>
      <select id="scan-page-format"><option value="a4" selected></option></select>
      <select id="scan-margin"><option value="18" selected></option></select>
      <button id="scan-clear-action"></button>
      <button id="scan-download-action"></button>
    </section>
  `;
}

describe('scan to PDF UI', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calculates rotated dimensions and draws the selected finish', () => {
    expect(getRotatedImageSize(800, 1200, 90)).toEqual({ width: 1200, height: 800 });
    const canvas = document.createElement('canvas');
    const context = canvasContext();
    vi.spyOn(canvas, 'getContext').mockReturnValue(context);
    expect(drawScannedImage(canvas, { width: 800, height: 1200 } as never, 90, 'document'))
      .toEqual({ width: 1200, height: 800 });
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(context.filter).toContain('contrast');
  });

  it('adds, orders and exports several images as one PDF', async () => {
    fixture();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext());
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    const buildPdf = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const saveAs = vi.fn();
    const cleanup = setupScanToPdf({
      i18n,
      saveAs,
      deps: { createPdfDocument: vi.fn() as never },
      buildPdf,
      decodeImage: vi.fn(async () => ({ width: 800, height: 1200 } as never)),
      createObjectUrl: file => `blob:${(file as File).name}`,
      revokeObjectUrl: vi.fn(),
    });
    const input = document.getElementById('scan-image-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        new File(['a'], 'pagina-muy-larga-uno.jpg', { type: 'image/jpeg' }),
        new File(['b'], 'pagina-dos.jpg', { type: 'image/jpeg' }),
      ],
    });
    input.dispatchEvent(new Event('change'));

    expect(document.querySelectorAll('.scan-page-item')).toHaveLength(2);
    document.querySelector<HTMLButtonElement>('[data-image-tool="scan"]')?.click();
    expect((document.getElementById('scan-tool-panel') as HTMLElement).hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('.image-tool-tabs')?.dataset.activeImageTool).toBe('scan');
    document.querySelectorAll<HTMLButtonElement>('[data-scan-action="down"]')[0]?.click();
    expect(document.querySelector('.scan-page-copy span')?.textContent).toBe('pagina-dos.jpg');

    document.getElementById('scan-download-action')?.click();
    await vi.waitFor(() => expect(buildPdf).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ type: 'image/jpeg' })]),
      { format: 'a4', margin: 18 },
      expect.any(Object),
    ));
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^escaneo-\d{4}-\d{2}-\d{2}\.pdf$/));
    cleanup();
  });
});
