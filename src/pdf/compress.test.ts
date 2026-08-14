import { describe, expect, it, vi } from 'vitest';
import { compressPdf, hasMeaningfulSafeReduction } from './compress';

function makeFile(size = 100) {
  return new File([new Uint8Array(size)], 'document.pdf', { type: 'application/pdf' });
}

describe('compressPdf', () => {
  it('uses structural optimization in safe mode', async () => {
    const save = vi.fn(async () => new Uint8Array(90_000));
    const deps = {
      loadPdfDocument: vi.fn(async () => ({ save })),
      buildCompressedPdfFromRenderedPages: vi.fn(),
    };

    const result = await compressPdf(makeFile(100_000), 'safe', deps);

    expect(result.outputSize).toBe(90_000);
    expect(result.rasterized).toBe(false);
    expect(result.attempts).toBe(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ useObjectStreams: true }));
    expect(deps.buildCompressedPdfFromRenderedPages).not.toHaveBeenCalled();
  });

  it('keeps the original when safe mode only saves a negligible amount', async () => {
    const result = await compressPdf(makeFile(100_000), 'safe', {
      loadPdfDocument: vi.fn(async () => ({ save: vi.fn(async () => new Uint8Array(99_000)) })),
      buildCompressedPdfFromRenderedPages: vi.fn(),
    });

    expect(result.keptOriginal).toBe(true);
    expect(result.outputSize).toBe(100_000);
  });

  it('uses the balanced visual preset and reports progress', async () => {
    const onProgress = vi.fn();
    const render = vi.fn(async (_buffer, options) => {
      options.onProgress?.(1, 2);
      return new Uint8Array(60);
    });

    const result = await compressPdf(makeFile(), 'balanced', {
      loadPdfDocument: vi.fn(),
      buildCompressedPdfFromRenderedPages: render,
    }, onProgress);

    expect(render).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.objectContaining({ scale: 1.5, quality: 0.82 }));
    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(result.rasterized).toBe(true);
  });

  it('tries progressively smaller compact presets and never returns a larger candidate', async () => {
    const render = vi.fn()
      .mockResolvedValueOnce(new Uint8Array(120))
      .mockResolvedValueOnce(new Uint8Array(115))
      .mockResolvedValueOnce(new Uint8Array(110));
    const result = await compressPdf(makeFile(), 'compact', {
      loadPdfDocument: vi.fn(),
      buildCompressedPdfFromRenderedPages: render,
    });

    expect(result.outputSize).toBe(100);
    expect(result.keptOriginal).toBe(true);
    expect(result.attempts).toBe(3);
    expect(render).toHaveBeenNthCalledWith(1, expect.any(ArrayBuffer), expect.objectContaining({ scale: 1.1, quality: 0.66 }));
    expect(render).toHaveBeenNthCalledWith(3, expect.any(ArrayBuffer), expect.objectContaining({ scale: 0.85, quality: 0.52 }));
  });

  it('keeps the smallest candidate when the target ratio is not reached', async () => {
    const render = vi.fn()
      .mockResolvedValueOnce(new Uint8Array(95))
      .mockResolvedValueOnce(new Uint8Array(84))
      .mockResolvedValueOnce(new Uint8Array(80));
    const result = await compressPdf(makeFile(), 'compact', {
      loadPdfDocument: vi.fn(),
      buildCompressedPdfFromRenderedPages: render,
    });

    expect(result.outputSize).toBe(80);
    expect(result.keptOriginal).toBe(false);
    expect(result.attempts).toBe(3);
  });
});

describe('hasMeaningfulSafeReduction', () => {
  it('requires at least 1% and 4 KB of savings', () => {
    expect(hasMeaningfulSafeReduction(1_000_000, 995_000)).toBe(false);
    expect(hasMeaningfulSafeReduction(1_000_000, 989_999)).toBe(true);
    expect(hasMeaningfulSafeReduction(100_000, 95_000)).toBe(true);
  });
});
