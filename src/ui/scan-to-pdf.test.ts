// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawScannedImage, getRotatedImageSize, setupScanToPdf } from './scan-to-pdf';

const i18n = (_en: string, es: string, vars: Record<string, string> = {}) =>
  Object.entries(vars).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), es);

function canvasContext() {
  return {
    fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    drawImage: vi.fn(), fillStyle: '', filter: '', beginPath: vi.fn(), rect: vi.fn(), moveTo: vi.fn(),
    lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(), arc: vi.fn(),
    strokeStyle: '', lineWidth: 1,
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
      <select id="scan-finish">
        <option value="document" selected></option><option value="grayscale"></option><option value="black-white"></option>
      </select>
      <div id="scan-tone-controls" hidden>
        <div data-scan-tone="grayscale">
          <input id="scan-contrast" type="range" min="50" max="220" value="100">
          <input id="scan-brightness" type="range" min="-40" max="40" value="0">
        </div>
        <div data-scan-tone="black-white">
          <input id="scan-threshold" type="range" min="0" max="255" value="150">
        </div>
      </div>
      <div id="scan-finish-preview" hidden>
        <select id="scan-preview-page"></select>
        <canvas id="scan-preview-canvas" hidden></canvas>
        <p id="scan-preview-status"></p>
      </div>
      <select id="scan-page-format"><option value="a4" selected></option></select>
      <select id="scan-margin"><option value="18" selected></option></select>
      <button id="scan-clear-action"></button>
      <button id="scan-download-action"></button>
      <div id="scan-crop-editor" hidden>
        <h3 id="scan-crop-title"></h3>
        <canvas id="scan-crop-canvas"></canvas>
        <button id="scan-crop-reset"></button>
        <button id="scan-crop-cancel"></button>
        <button id="scan-crop-apply"></button>
      </div>
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

  it('uses the selected grayscale brightness and black threshold on the rendered pixels', () => {
    const canvas = document.createElement('canvas');
    const context = Object.assign(canvasContext(), {
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([120, 120, 120, 255]) })),
      putImageData: vi.fn(),
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue(context);
    const source = { width: 1, height: 1 } as never;
    const tone = { contrast: 150, brightness: 20, threshold: 100 };

    drawScannedImage(canvas, source, 0, 'grayscale', tone);
    expect(context.putImageData.mock.lastCall?.[0].data[0]).toBe(167);
    drawScannedImage(canvas, source, 0, 'black-white', tone);
    expect(context.putImageData.mock.lastCall?.[0].data[0]).toBe(255);
    drawScannedImage(canvas, source, 0, 'black-white', { ...tone, threshold: 140 });
    expect(context.putImageData.mock.lastCall?.[0].data[0]).toBe(0);
    context.getImageData.mockReturnValueOnce({ data: new Uint8ClampedArray([255, 255, 255, 255]) });
    drawScannedImage(canvas, source, 0, 'black-white', { ...tone, threshold: 255 });
    expect(context.putImageData.mock.lastCall?.[0].data[0]).toBe(255);
  });

  it('uses the same adjusted threshold in the preview and the exported page', async () => {
    fixture();
    const context = Object.assign(canvasContext(), {
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([120, 120, 120, 255]) })),
      putImageData: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
      expect(context.putImageData.mock.lastCall?.[0].data[0]).toBe(255);
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    const saveAs = vi.fn();
    const cleanup = setupScanToPdf({
      i18n,
      saveAs,
      deps: { createPdfDocument: vi.fn() as never },
      buildPdf: vi.fn(async () => new Uint8Array([1])),
      decodeImage: vi.fn(async () => ({ width: 1, height: 1 } as never)),
      createObjectUrl: () => 'blob:scan',
      revokeObjectUrl: vi.fn(),
    });
    const input = document.querySelector<HTMLInputElement>('#scan-image-input')!;
    Object.defineProperty(input, 'files', { value: [new File(['page'], 'page.jpg', { type: 'image/jpeg' })] });
    input.dispatchEvent(new Event('change'));
    const finish = document.querySelector<HTMLSelectElement>('#scan-finish')!;
    finish.value = 'black-white';
    finish.dispatchEvent(new Event('change'));
    expect(document.getElementById('scan-tone-controls')?.hidden).toBe(false);
    await vi.waitFor(() => expect(context.putImageData.mock.lastCall?.[0].data[0]).toBe(0));

    const threshold = document.querySelector<HTMLInputElement>('#scan-threshold')!;
    threshold.value = '100';
    threshold.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(context.putImageData.mock.lastCall?.[0].data[0]).toBe(255));
    document.getElementById('scan-download-action')?.click();
    await vi.waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
    cleanup();
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

  it('opens the crop editor only once the photo is ready and keeps its canvas sized while editing', async () => {
    fixture();
    const context = canvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const canvas = document.querySelector<HTMLCanvasElement>('#scan-crop-canvas')!;
    const resizeWidth = vi.spyOn(canvas, 'width', 'set');
    const resizeHeight = vi.spyOn(canvas, 'height', 'set');
    let finishLoading!: (image: never) => void;
    const decodeImage = vi.fn(() => new Promise<never>(resolve => { finishLoading = resolve; }));
    const cleanup = setupScanToPdf({
      i18n,
      saveAs: vi.fn(),
      deps: { createPdfDocument: vi.fn() as never },
      decodeImage,
      createObjectUrl: file => `blob:${(file as File).name}`,
      revokeObjectUrl: vi.fn(),
    });
    const input = document.getElementById('scan-image-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['page'], 'contrato.jpg', { type: 'image/jpeg' })],
    });
    input.dispatchEvent(new Event('change'));
    document.querySelector<HTMLButtonElement>('[data-image-tool="scan"]')?.click();
    document.querySelector<HTMLButtonElement>('[data-scan-action="crop"]')?.click();

    expect(document.getElementById('scan-crop-editor')?.hidden).toBe(true);
    finishLoading({ width: 900, height: 1200 } as never);
    await vi.waitFor(() => expect(document.getElementById('scan-crop-editor')?.hidden).toBe(false));
    expect(canvas.width).toBe(900);
    expect(canvas.height).toBe(1200);

    const draws = vi.mocked(context.drawImage).mock.calls.length;
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }));
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 1, clientY: 1 }));
    canvas.dispatchEvent(new MouseEvent('pointerup'));
    expect(context.drawImage).toHaveBeenCalledTimes(draws);
    await vi.waitFor(() => expect(context.drawImage).toHaveBeenCalledTimes(draws + 1));
    expect(resizeWidth).toHaveBeenCalledTimes(1);
    expect(resizeHeight).toHaveBeenCalledTimes(1);

    document.getElementById('scan-crop-apply')?.click();

    expect(document.getElementById('scan-crop-editor')?.hidden).toBe(true);
    expect(document.querySelector('.scan-page-adjusted')?.textContent).toBe('Bordes ajustados');
    cleanup();
  });
});
