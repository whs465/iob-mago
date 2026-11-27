// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { renderEnhancementPage } from '../pdf/enhance-pages';
import { buildStackedPdf } from '../pdf/stack-pages';
import { setupStackPagesFlow } from './stack-pages-flow';

vi.mock('../pdf/enhance-pages', () => ({ renderEnhancementPage: vi.fn() }));
vi.mock('../pdf/stack-pages', async importOriginal => ({
  ...await importOriginal<typeof import('../pdf/stack-pages')>(),
  buildStackedPdf: vi.fn(),
}));
afterEach(() => vi.restoreAllMocks());

it('swaps two selected pages and exports them in preview order', async () => {
  document.body.innerHTML = `
    <button id="stack-open" disabled></button><div id="stack-editor" hidden>
      <select id="stack-top"></select><select id="stack-bottom"></select>
      <input type="checkbox" id="stack-trim"><button id="stack-swap"></button>
      <canvas id="stack-preview" hidden></canvas><button id="stack-download" disabled></button>
    </div><p id="stack-status"></p>
  `;
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage, fillRect: vi.fn(), getImageData: () => ({ width: 1, height: 1, data: Uint8ClampedArray.of(255, 255, 255, 255) }),
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'])));
  vi.mocked(renderEnhancementPage).mockImplementation((_page, canvas) => {
    canvas.width = canvas.height = 1;
    return { promise: Promise.resolve(), cancel: vi.fn() } as never;
  });
  vi.mocked(buildStackedPdf).mockResolvedValue(Uint8Array.of(1));
  const saveAs = vi.fn();
  const { setFile } = setupStackPagesFlow({
    pdfjs: { AnnotationMode: { ENABLE: 1 }, getDocument: () => ({
      promise: Promise.resolve({ numPages: 2, getPage: async (n: number) => ({ getViewport: () => ({ width: n * 100, height: 90 }) }) }),
      destroy: vi.fn(async () => {}),
    }) } as never,
    i18n: (english, _spanish, variables) => english.replace('{{page}}', variables?.page ?? ''),
    saveAs,
  });
  setFile(new File(['pdf'], 'id.pdf'));
  document.getElementById('stack-open')!.click();
  await vi.waitFor(() => expect(document.getElementById('stack-preview')?.hidden).toBe(false));
  document.getElementById('stack-swap')!.click();
  document.getElementById('stack-download')!.click();
  await vi.waitFor(() => expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'id-two-in-one.pdf'));
  expect(buildStackedPdf).toHaveBeenCalledWith([
    expect.objectContaining({ placement: expect.objectContaining({ width: 200 }) }),
    expect.objectContaining({ placement: expect.objectContaining({ width: 100 }) }),
  ]);
  setFile(undefined);
});
