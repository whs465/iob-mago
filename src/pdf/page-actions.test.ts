import { describe, expect, it, vi } from 'vitest';
import type { PdfOperationDeps } from './operations';
import {
  extractPdfPagesFromText,
  removePdfPagesFromText,
  reorderPdfPagesFromOrder,
  rotatePdfPagesFromText,
  type PageActionDeps,
} from './page-actions';

function makeFile() {
  return new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
}

function makeDeps(overrides: Partial<PageActionDeps> = {}): PageActionDeps {
  return {
    getPageCountFromArrayBuffer: vi.fn(async () => ({ pageCount: 5 })),
    operationDeps: {} as PdfOperationDeps,
    ...overrides,
  };
}

describe('page action helpers', () => {
  it('extracts parsed pages from a PDF', async () => {
    const extractPdfPages = vi.fn(async () => ({
      pdfBytes: new Uint8Array([1, 2, 3]),
      rasterizedFiles: [],
      extractedPageCount: 2,
    }));
    const deps = makeDeps({ extractPdfPages });

    const result = await extractPdfPagesFromText(makeFile(), '1, 3', deps);

    expect(result.status).toBe('ok');
    expect(extractPdfPages).toHaveBeenCalledWith(makeFile(), [0, 2], deps.operationDeps);
  });

  it('rejects invalid required extract ranges', async () => {
    const extractPdfPages = vi.fn();
    const result = await extractPdfPagesFromText(makeFile(), '9', makeDeps({ extractPdfPages }));

    expect(result).toEqual({ status: 'invalid-pages' });
    expect(extractPdfPages).not.toHaveBeenCalled();
  });

  it('removes pages by passing only remaining indices to the operation', async () => {
    const removePdfPages = vi.fn(async () => ({
      pdfBytes: new Uint8Array([4, 5, 6]),
      rasterizedFiles: [],
      removedPageCount: 2,
    }));
    const deps = makeDeps({ removePdfPages });

    const result = await removePdfPagesFromText(makeFile(), '2, 4', deps);

    expect(result.status).toBe('ok');
    expect(removePdfPages).toHaveBeenCalledWith(makeFile(), [0, 2, 4], 2, deps.operationDeps);
  });

  it('prevents removing every page', async () => {
    const removePdfPages = vi.fn();
    const deps = makeDeps({
      getPageCountFromArrayBuffer: vi.fn(async () => ({ pageCount: 2 })),
      removePdfPages,
    });

    const result = await removePdfPagesFromText(makeFile(), '1-2', deps);

    expect(result).toEqual({ status: 'empty-removal' });
    expect(removePdfPages).not.toHaveBeenCalled();
  });

  it('reorders pages using the provided page order', async () => {
    const reorderPdfPages = vi.fn(async () => ({
      pdfBytes: new Uint8Array([6, 6, 6]),
      rasterizedFiles: [],
    }));
    const deps = makeDeps({ reorderPdfPages });

    const result = await reorderPdfPagesFromOrder(makeFile(), [2, 0, 1], deps);

    expect(result.status).toBe('ok');
    expect(reorderPdfPages).toHaveBeenCalledWith(makeFile(), [2, 0, 1], deps.operationDeps);
  });

  it('rejects empty page orders before reordering', async () => {
    const reorderPdfPages = vi.fn();

    const result = await reorderPdfPagesFromOrder(makeFile(), [], makeDeps({ reorderPdfPages }));

    expect(result).toEqual({ status: 'empty-order' });
    expect(reorderPdfPages).not.toHaveBeenCalled();
  });

  it('rotates all pages when the optional range is blank', async () => {
    const rotatePdfPagesToPortrait = vi.fn(async () => ({
      pdfBytes: new Uint8Array([7, 8, 9]),
      rasterizedFiles: [],
      rotatedCount: 1,
    }));
    const deps = makeDeps({ rotatePdfPagesToPortrait });

    const result = await rotatePdfPagesFromText(makeFile(), '', deps);

    expect(result.status).toBe('ok');
    expect(rotatePdfPagesToPortrait).toHaveBeenCalledWith(makeFile(), null, deps.operationDeps);
  });

  it('reports when rotation finds no landscape pages', async () => {
    const rotatePdfPagesToPortrait = vi.fn(async () => ({
      pdfBytes: new Uint8Array([7, 8, 9]),
      rasterizedFiles: [],
      rotatedCount: 0,
    }));

    const result = await rotatePdfPagesFromText(
      makeFile(),
      '1',
      makeDeps({ rotatePdfPagesToPortrait }),
    );

    expect(result).toEqual({ status: 'no-landscape-pages' });
  });
});
