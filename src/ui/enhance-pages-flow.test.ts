// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { enhancePdfPages, renderEnhancementPage } from '../pdf/enhance-pages';
import { setupEnhancePagesFlow } from './enhance-pages-flow';

vi.mock('../pdf/enhance-pages', async importOriginal => ({
  ...await importOriginal<typeof import('../pdf/enhance-pages')>(),
  enhancePdfPages: vi.fn(),
  renderEnhancementPage: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

it('tracks adjustments per page, exports only edited pages and resets when the source changes', async () => {
  document.body.innerHTML = `
    <button id="enhance-open" disabled></button><div id="enhance-editor" hidden>
      <canvas id="enhance-preview" width="1" height="1" hidden></canvas>
      <select id="enhance-page"></select><fieldset id="enhance-tone-controls">
        <input id="enhance-contrast" type="range" min="50" max="350" value="100">
        <input id="enhance-brightness" type="range" min="-35" max="35" value="0">
        <input id="enhance-original" type="checkbox"><button id="enhance-reset"></button>
        <output id="enhance-contrast-value"></output><output id="enhance-brightness-value"></output>
      </fieldset>
      <button id="enhance-download"></button><p id="enhance-count"></p>
    </div><p id="enhance-status"></p>
  `;
  const pixels = () => ({ data: new Uint8ClampedArray([200, 200, 200, 255]) });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    getImageData: pixels, createImageData: pixels, putImageData: vi.fn(),
  } as never);
  vi.mocked(renderEnhancementPage).mockReturnValue({ promise: Promise.resolve(), cancel: vi.fn() } as never);
  vi.mocked(enhancePdfPages).mockResolvedValue(Uint8Array.of(1));
  const destroy = vi.fn(async () => {});
  const api = setupEnhancePagesFlow({
    pdfjs: {
      AnnotationMode: { DISABLE: 0 },
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({ numPages: 2, getPage: vi.fn(async () => ({})) }), destroy,
      })),
    } as never,
    i18n: (english, _spanish, data) => english.replace(/{{(\w+)}}/g, (_, key) => data?.[key] ?? ''),
    saveAs: vi.fn(),
  });
  const find = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  api.setFile(new File(['pdf'], 'mixed.pdf'));
  find('enhance-open').click();
  await vi.waitFor(() => expect(find('enhance-preview').hidden).toBe(false));
  const select = find<HTMLSelectElement>('enhance-page');
  select.value = '2';
  select.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(find('enhance-preview').hidden).toBe(false));
  const contrast = find<HTMLInputElement>('enhance-contrast');
  contrast.value = '190';
  contrast.dispatchEvent(new Event('input'));
  select.value = '1';
  select.dispatchEvent(new Event('change'));
  expect(contrast.value).toBe('100');
  find('enhance-download').click();
  await vi.waitFor(() => expect(enhancePdfPages).toHaveBeenCalledWith(
    expect.any(ArrayBuffer), new Map([[2, { contrast: 190, brightness: 0 }]]), expect.any(Function),
  ));
  api.setFile(undefined);
  expect(find('enhance-editor').hidden).toBe(true);
  expect(destroy).toHaveBeenCalledOnce();
});
