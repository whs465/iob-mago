// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPdfRenderRuntime } from './render';

describe('buildUnlockedPdfFromRenderedPages', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens with the supplied password and rebuilds every page without encryption', async () => {
    const drawImage = vi.fn();
    const addPage = vi.fn(() => ({ drawImage }));
    const embedPng = vi.fn(async () => ({ width: 1200, height: 1600 }));
    const save = vi.fn(async () => new Uint8Array([7, 8, 9]));
    const render = vi.fn(() => ({ promise: Promise.resolve() }));
    const getPage = vi.fn(async () => ({
      getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
      render,
    }));
    const destroy = vi.fn(async () => undefined);
    const getDocument = vi.fn(() => ({
      promise: Promise.resolve({ numPages: 2, getPage, destroy }),
    }));
    const progress = vi.fn();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cGFnZQ==');

    const runtime = createPdfRenderRuntime({
      PDFDocument: {
        create: vi.fn(async () => ({ embedPng, addPage, save })),
        load: vi.fn(),
      } as never,
      pdfjsLib: { getDocument } as never,
    });
    const input = new ArrayBuffer(4);
    const result = await runtime.buildUnlockedPdfFromRenderedPages(input, 'correct-password', progress);

    expect(getDocument).toHaveBeenCalledWith({ data: expect.any(ArrayBuffer), password: 'correct-password' });
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(addPage).toHaveBeenNthCalledWith(1, [600, 800]);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(progress).toHaveBeenNthCalledWith(2, 2, 2);
    expect(destroy).toHaveBeenCalledOnce();
    expect(result).toEqual(new Uint8Array([7, 8, 9]));
  });
});
