import { describe, expect, it, vi } from 'vitest';
import { appendPdfFilePages } from './copy-pages';

const PDFName = {
  of: (name: string) => name,
};

class MockDict {
  private values = new Map<string, unknown>();

  constructor(values: Record<string, unknown> = {}) {
    Object.entries(values).forEach(([key, value]) => this.values.set(key, value));
  }

  get(name: unknown) {
    return this.values.get(String(name));
  }
}

function makeFile() {
  return new File(['fake-pdf'], 'source.pdf', { type: 'application/pdf' });
}

describe('appendPdfFilePages', () => {
  it('copies all pages and preserves source bookmarks when no subset is provided', async () => {
    const page0Ref = { toString: () => 'page-0' };
    const bookmark = new MockDict({
      Title: { decodeText: () => 'Existing' },
      Dest: { get: (index: number) => [page0Ref, 'Fit'][index] },
    });
    const sourcePdf = {
      catalog: new MockDict({ Outlines: new MockDict({ First: bookmark }) }),
      context: { lookup: (value: unknown) => value },
      getPageIndices: () => [0, 1],
      getPages: () => [
        { ref: page0Ref, node: { id: 0 } },
        { ref: { toString: () => 'page-1' }, node: { id: 1 } },
      ],
    };
    const copiedPages = [{ id: 'copy-0' }, { id: 'copy-1' }];
    const targetPdf = {
      copyPages: vi.fn().mockResolvedValue(copiedPages),
      addPage: vi.fn(() => ({ drawImage: vi.fn() })),
      embedPng: vi.fn(),
    };

    const result = await appendPdfFilePages(targetPdf, makeFile(), {
      loadPdfDocument: vi.fn().mockResolvedValue(sourcePdf),
      isEncryptedPdfError: () => false,
      appendRenderedPdfPages: vi.fn(),
      bookmarkDeps: { PDFName },
    });

    expect(targetPdf.copyPages).toHaveBeenCalledWith(sourcePdf, [0, 1]);
    expect(targetPdf.addPage).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      pageCount: 2,
      rasterized: false,
      bookmarks: [{ title: 'Existing', pageIndex: 0, children: [] }],
    });
  });

  it('remaps bookmarks when a subset or reordered page list is copied', async () => {
    const page0Ref = { toString: () => 'page-0' };
    const page2Ref = { toString: () => 'page-2' };
    const first = new MockDict({
      Title: { decodeText: () => 'First page' },
      Dest: { get: (index: number) => [page0Ref, 'Fit'][index] },
    });
    const second = new MockDict({
      Title: { decodeText: () => 'Third page' },
      Dest: { get: (index: number) => [page2Ref, 'Fit'][index] },
    });
    first.get = (name: unknown) => {
      if (String(name) === 'Next') return second;
      return new MockDict({
        Title: { decodeText: () => 'First page' },
        Dest: { get: (index: number) => [page0Ref, 'Fit'][index] },
      }).get(name);
    };
    const sourcePdf = {
      catalog: new MockDict({ Outlines: new MockDict({ First: first }) }),
      context: { lookup: (value: unknown) => value },
      getPageIndices: () => [0, 1, 2],
      getPages: () => [
        { ref: page0Ref, node: { id: 0 } },
        { ref: { toString: () => 'page-1' }, node: { id: 1 } },
        { ref: page2Ref, node: { id: 2 } },
      ],
    };
    const targetPdf = {
      copyPages: vi.fn().mockResolvedValue([{ id: 'copy-2' }, { id: 'copy-0' }]),
      addPage: vi.fn(() => ({ drawImage: vi.fn() })),
      embedPng: vi.fn(),
    };

    const result = await appendPdfFilePages(targetPdf, makeFile(), {
      loadPdfDocument: vi.fn().mockResolvedValue(sourcePdf),
      isEncryptedPdfError: () => false,
      appendRenderedPdfPages: vi.fn(),
      bookmarkDeps: { PDFName },
    }, [2, 0]);

    expect(targetPdf.copyPages).toHaveBeenCalledWith(sourcePdf, [2, 0]);
    expect(result.bookmarks).toEqual([
      { title: 'First page', pageIndex: 1 },
      { title: 'Third page', pageIndex: 0 },
    ]);
  });

  it('falls back to rendered pages for encrypted PDFs', async () => {
    const encryptedError = new Error('Input document is encrypted');
    const appendRenderedPdfPages = vi.fn().mockResolvedValue(3);
    const targetPdf = {
      copyPages: vi.fn(),
      addPage: vi.fn(() => ({ drawImage: vi.fn() })),
      embedPng: vi.fn(),
    };

    const result = await appendPdfFilePages(targetPdf, makeFile(), {
      loadPdfDocument: vi.fn().mockRejectedValue(encryptedError),
      isEncryptedPdfError: error => error === encryptedError,
      appendRenderedPdfPages,
      bookmarkDeps: { PDFName },
    }, [0, 1, 2]);

    expect(targetPdf.copyPages).not.toHaveBeenCalled();
    expect(appendRenderedPdfPages).toHaveBeenCalledWith(targetPdf, expect.any(ArrayBuffer), [0, 1, 2]);
    expect(result).toEqual({ pageCount: 3, rasterized: true, bookmarks: [] });
  });
});
