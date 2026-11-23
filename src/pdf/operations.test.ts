import { describe, expect, it, vi } from 'vitest';
import {
  extractPdfPages,
  mergePdfFiles,
  type PdfOperationDeps,
  removePdfPages,
  reorderPdfPages,
  rotatePdfPagesToPortrait,
  splitPdfIntoPages,
} from './operations';
import type { SourcePdfLike } from './copy-pages';
import { PDFDocument, PDFName as RealName, PDFHexString as RealHexString, PDFString, degrees } from 'pdf-lib';
import { extractPdfBookmarks } from './bookmarks';

const PDFName = {
  of: (name: string) => name,
};

const PDFHexString = {
  fromText: (text: string) => ({ text }),
};

class MockDict {
  private values = new Map<string, unknown>();

  constructor(values: Record<string, unknown> = {}) {
    Object.entries(values).forEach(([key, value]) => this.values.set(key, value));
  }

  get(name: unknown) {
    return this.values.get(String(name));
  }

  set(name: unknown, value: unknown) {
    this.values.set(String(name), value);
  }
}

function createTargetPdf() {
  const assigned = new Map<unknown, unknown>();
  const pdf = {
    catalog: new MockDict(),
    context: {
      lookup: (value: unknown) => value,
      nextRef: (() => {
        let index = 0;
        return () => `ref-${index++}`;
      })(),
      obj: (value: unknown) => new MockDict(value && !Array.isArray(value) ? value as Record<string, unknown> : { value }),
      assign: (ref: unknown, value: unknown) => {
        assigned.set(ref, value);
      },
    },
    pageCount: 0,
    copyPages: vi.fn(async (_sourcePdf: unknown, indices: number[]) => indices.map(index => ({ index }))),
    addPage: vi.fn(() => {
      pdf.pageCount++;
      return { drawImage: vi.fn() };
    }),
    embedPng: vi.fn(async () => ({ width: 100, height: 100 })),
    getPageCount: vi.fn(() => pdf.pageCount),
    getPage: vi.fn((index: number) => ({ ref: `page-${index}` })),
    getPages: vi.fn(() => []),
    save: vi.fn(async () => new Uint8Array([1, 2, 3])),
    assigned,
  };
  return pdf;
}

function createSourcePdf(pageCount: number) {
  return {
    catalog: new MockDict(),
    context: {
      lookup: (value: unknown) => value,
      nextRef: () => 'unused-ref',
      obj: (value: unknown) => value,
      assign: () => undefined,
    },
    getPage: (index: number) => ({ ref: `source-page-${index}` }),
    getPageIndices: () => Array.from({ length: pageCount }, (_, index) => index),
    getPages: () => Array.from({ length: pageCount }, (_, index) => ({
      ref: { toString: () => `source-page-${index}` },
      node: { index },
    })),
  };
}

function makeFile(name: string) {
  return new File(['fake-pdf'], name, { type: 'application/pdf' });
}

it('keeps direct and named bookmarks attached to the same physical pages across document operations', async () => {
  const source = await PDFDocument.create();
  const pages = [100, 200, 300].map(width => source.addPage([width, 400]));
  const { context } = source;
  const destination = (page: number) => context.obj([pages[page].ref, 'Fit']);
  const namesLeaf = context.register(context.obj({
    Names: [PDFString.of('third'), { D: destination(2) }],
  }));
  source.catalog.set(RealName.of('Names'), context.obj({ Dests: { Kids: [namesLeaf] } }));
  source.catalog.set(RealName.of('Dests'), context.obj({ second: destination(1) }));
  const outline = context.nextRef();
  const third = context.register(context.obj({
    Title: PDFString.of('C'), Parent: outline, A: { S: 'GoTo', D: PDFString.of('third') },
  }));
  const second = context.register(context.obj({
    Title: PDFString.of('B'), Parent: outline, Dest: RealName.of('second'), Next: third,
  }));
  const first = context.register(context.obj({
    Title: PDFString.of('A'), Parent: outline, Dest: destination(0), Next: second,
  }));
  context.assign(outline, context.obj({ Type: 'Outlines', First: first, Last: third, Count: 3 }));
  source.catalog.set(RealName.of('Outlines'), outline);
  const file = new File([Uint8Array.from(await source.save())], 'source.pdf');

  const bookmarkDeps = { PDFName: RealName, PDFHexString: RealHexString };
  const deps: PdfOperationDeps = {
    PDFDocument,
    pageCopyDeps: {
      loadPdfDocument: bytes => PDFDocument.load(bytes),
      isEncryptedPdfError: () => false,
      appendRenderedPdfPages: vi.fn(),
      bookmarkDeps,
    },
    bookmarkDeps,
    degrees,
    buildRotatedPortraitPdfFromRenderedPages: vi.fn(),
  };
  const assertBookmarks = async (pdfBytes: Uint8Array, expected: Array<[string, number, number]>) => {
    const pdf = await PDFDocument.load(pdfBytes);
    const bookmarks = extractPdfBookmarks(pdf, bookmarkDeps);
    expect(bookmarks.map(({ title, pageIndex }) => [title, pageIndex, pdf.getPage(pageIndex).getWidth()]))
      .toEqual(expected);
  };

  await assertBookmarks((await reorderPdfPages(file, [2, 0, 1], deps)).pdfBytes,
    [['C', 0, 300], ['A', 1, 100], ['B', 2, 200]]);
  await assertBookmarks((await extractPdfPages(file, [2, 1], deps)).pdfBytes,
    [['C', 0, 300], ['B', 1, 200]]);
  await assertBookmarks((await removePdfPages(file, [0, 2], 1, deps)).pdfBytes,
    [['A', 0, 100], ['C', 1, 300]]);
  const split = await splitPdfIntoPages(file, deps);
  await assertBookmarks(split.pages[1].pdfBytes, [['B', 0, 200]]);
  await assertBookmarks(split.pages[2].pdfBytes, [['C', 0, 300]]);

  const cover = await PDFDocument.create();
  cover.addPage([400, 400]);
  const coverFile = new File([Uint8Array.from(await cover.save())], 'cover.pdf');
  const merged = await mergePdfFiles([coverFile, file], { addFileBookmarks: false, deps });
  await assertBookmarks(merged.pdfBytes, [['A', 1, 100], ['B', 2, 200], ['C', 3, 300]]);
});

function makeDeps(
  targetPdf: ReturnType<typeof createTargetPdf>,
  sourcePdf: SourcePdfLike = createSourcePdf(2),
): PdfOperationDeps {
  return {
    PDFDocument: {
      create: vi.fn(async () => targetPdf),
    },
    pageCopyDeps: {
      loadPdfDocument: vi.fn(async () => sourcePdf),
      isEncryptedPdfError: vi.fn((_error: unknown) => false),
      appendRenderedPdfPages: vi.fn(async () => 0),
      bookmarkDeps: { PDFName },
    },
    bookmarkDeps: { PDFHexString, PDFName },
    degrees: vi.fn((angle: number) => ({ angle })),
    buildRotatedPortraitPdfFromRenderedPages: vi.fn(async () => ({
      pdfBytes: new Uint8Array([9, 9, 9]),
      rotatedCount: 1,
    })),
  };
}

describe('pdf operations', () => {
  it('merges files, adds optional file bookmarks, and saves bytes', async () => {
    const targetPdf = createTargetPdf();
    const deps = makeDeps(targetPdf);
    const onFileProcessing = vi.fn();

    const result = await mergePdfFiles(
      [makeFile('a.pdf'), makeFile('b.pdf')],
      { addFileBookmarks: true, deps, onFileProcessing },
    );

    expect(onFileProcessing).toHaveBeenCalledTimes(2);
    expect(targetPdf.copyPages).toHaveBeenCalledTimes(2);
    expect(targetPdf.addPage).toHaveBeenCalledTimes(4);
    expect(targetPdf.catalog.get('Outlines')).toBe('ref-0');
    expect(result).toEqual({
      pdfBytes: new Uint8Array([1, 2, 3]),
      rasterizedFiles: [],
    });
  });

  it('removes pages by copying only kept page indices', async () => {
    const targetPdf = createTargetPdf();
    const deps = makeDeps(targetPdf, createSourcePdf(4));

    const result = await removePdfPages(makeFile('source.pdf'), [0, 2, 3], 1, deps);

    expect(targetPdf.copyPages).toHaveBeenCalledWith(expect.anything(), [0, 2, 3]);
    expect(result.removedPageCount).toBe(1);
    expect(result.rasterizedFiles).toEqual([]);
  });

  it('reorders pages by copying requested indices in order', async () => {
    const targetPdf = createTargetPdf();
    const deps = makeDeps(targetPdf, createSourcePdf(3));

    const result = await reorderPdfPages(makeFile('source.pdf'), [2, 0, 1], deps);

    expect(targetPdf.copyPages).toHaveBeenCalledWith(expect.anything(), [2, 0, 1]);
    expect(result.pdfBytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('splits a PDF into one saved document per page', async () => {
    const targetPdf = createTargetPdf();
    const deps = makeDeps(targetPdf, createSourcePdf(3));

    const result = await splitPdfIntoPages(makeFile('source.pdf'), deps);

    expect(deps.PDFDocument.create).toHaveBeenCalledTimes(3);
    expect(targetPdf.copyPages).toHaveBeenNthCalledWith(1, expect.anything(), [0]);
    expect(targetPdf.copyPages).toHaveBeenNthCalledWith(2, expect.anything(), [1]);
    expect(targetPdf.copyPages).toHaveBeenNthCalledWith(3, expect.anything(), [2]);
    expect(result.pageCount).toBe(3);
    expect(result.pages.map(page => page.filename)).toEqual([
      'pagina-001.pdf',
      'pagina-002.pdf',
      'pagina-003.pdf',
    ]);
  });

  it('extracts selected pages into a single document', async () => {
    const targetPdf = createTargetPdf();
    const deps = makeDeps(targetPdf, createSourcePdf(5));

    const result = await extractPdfPages(makeFile('source.pdf'), [0, 3, 4], deps);

    expect(targetPdf.copyPages).toHaveBeenCalledWith(expect.anything(), [0, 3, 4]);
    expect(result).toEqual({
      pdfBytes: new Uint8Array([1, 2, 3]),
      rasterizedFiles: [],
      extractedPageCount: 3,
    });
  });

  it('rotates landscape pages to portrait in a normal PDF', async () => {
    const targetPdf = createTargetPdf();
    const landscapePage = {
      ref: 'source-page-0',
      getSize: () => ({ width: 800, height: 600 }),
      getRotation: () => ({ angle: 0 }),
      setRotation: vi.fn(),
    };
    const portraitPage = {
      ref: 'source-page-1',
      getSize: () => ({ width: 600, height: 800 }),
      getRotation: () => ({ angle: 0 }),
      setRotation: vi.fn(),
    };
    const sourcePdf = {
      ...createSourcePdf(2),
      getPage: (index: number) => [landscapePage, portraitPage][index],
      save: vi.fn(async () => new Uint8Array([4, 5, 6])),
    };
    const deps = makeDeps(targetPdf, sourcePdf);

    const result = await rotatePdfPagesToPortrait(makeFile('source.pdf'), [0, 1], deps);

    expect(landscapePage.setRotation).toHaveBeenCalledWith({ angle: 90 });
    expect(portraitPage.setRotation).not.toHaveBeenCalled();
    expect(result).toEqual({
      pdfBytes: new Uint8Array([4, 5, 6]),
      rasterizedFiles: [],
      rotatedCount: 1,
    });
  });

  it.each([
    ['right', 90],
    ['left', 270],
    ['half-turn', 180],
  ] as const)('applies the %s rotation to every selected page', async (mode, expectedAngle) => {
    const targetPdf = createTargetPdf();
    const page = {
      ref: 'source-page-0',
      getSize: () => ({ width: 600, height: 800 }),
      getRotation: () => ({ angle: 0 }),
      setRotation: vi.fn(),
    };
    const sourcePdf = {
      ...createSourcePdf(1),
      getPage: () => page,
      save: vi.fn(async () => new Uint8Array([4, 5, 6])),
    };
    const deps = makeDeps(targetPdf, sourcePdf);

    const result = await rotatePdfPagesToPortrait(makeFile('source.pdf'), [0], deps, mode);

    expect(page.setRotation).toHaveBeenCalledWith({ angle: expectedAngle });
    expect(result.rotatedCount).toBe(1);
  });

  it('uses rendered rotation for encrypted PDFs', async () => {
    const targetPdf = createTargetPdf();
    const encryptedError = new Error('encrypted');
    const deps = makeDeps(targetPdf);
    deps.pageCopyDeps.loadPdfDocument = vi.fn(async () => {
      throw encryptedError;
    });
    deps.pageCopyDeps.isEncryptedPdfError = vi.fn((error: unknown) => error === encryptedError);

    const result = await rotatePdfPagesToPortrait(makeFile('locked.pdf'), [0], deps);

    expect(deps.buildRotatedPortraitPdfFromRenderedPages).toHaveBeenCalledWith(expect.any(ArrayBuffer), [0], 'auto');
    expect(result).toEqual({
      pdfBytes: new Uint8Array([9, 9, 9]),
      rasterizedFiles: ['locked.pdf'],
      rotatedCount: 1,
    });
  });
});
