import { describe, expect, it } from 'vitest';
import {
  type BookmarkNode,
  type PdfDocumentLike,
  extractPdfBookmarks,
  flattenOffsetBookmarks,
  remapBookmarksToCopiedPages,
  writeFlatBookmarks,
} from './bookmarks';

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

class MockArray {
  constructor(private values: unknown[]) {}

  get(index: number) {
    return this.values[index];
  }
}

function makeTitle(text: string) {
  return { decodeText: () => text };
}

function expectMockDict(value: unknown) {
  expect(value).toBeInstanceOf(MockDict);
  return value as MockDict;
}

describe('bookmark transforms', () => {
  const tree: BookmarkNode[] = [
    {
      title: 'Cover',
      pageIndex: 0,
      children: [
        { title: 'Nested A', pageIndex: 2, children: [] },
        { title: 'No destination', pageIndex: null, children: [] },
      ],
    },
    {
      title: 'Chapter',
      pageIndex: 4,
      children: [{ title: 'Nested B', pageIndex: 5, children: [] }],
    },
  ];

  it('flattens nested bookmarks and offsets page indices', () => {
    expect(flattenOffsetBookmarks(tree, 10)).toEqual([
      { title: 'Cover', pageIndex: 10 },
      { title: 'Nested A', pageIndex: 12 },
      { title: 'Chapter', pageIndex: 14 },
      { title: 'Nested B', pageIndex: 15 },
    ]);
  });

  it('remaps only bookmarks whose source pages were copied', () => {
    expect(remapBookmarksToCopiedPages(tree, [4, 0, 2])).toEqual([
      { title: 'Cover', pageIndex: 1 },
      { title: 'Nested A', pageIndex: 2 },
      { title: 'Chapter', pageIndex: 0 },
    ]);
  });
});

describe('extractPdfBookmarks', () => {
  it('reads a simple nested outline tree', () => {
    const page0Ref = { toString: () => 'page-0' };
    const page1Ref = { toString: () => 'page-1' };
    const child = new MockDict({
      Title: makeTitle('Child'),
      Dest: new MockArray([page1Ref, 'Fit']),
    });
    const first = new MockDict({
      Title: makeTitle('Root'),
      Dest: new MockArray([page0Ref, 'Fit']),
      First: child,
    });
    const outlines = new MockDict({ First: first });
    const catalog = new MockDict({ Outlines: outlines });
    const pdfDoc: PdfDocumentLike = {
      catalog,
      context: {
        lookup: (value: unknown) => value,
        nextRef: () => 'unused-ref',
        obj: (value: unknown) => value,
        assign: () => undefined,
      },
      getPage: (index: number) => ({ ref: `page-${index}` }),
      getPages: () => [
        { ref: page0Ref, node: { id: 0 } },
        { ref: page1Ref, node: { id: 1 } },
      ],
    };

    expect(extractPdfBookmarks(pdfDoc, { PDFName })).toEqual([
      {
        title: 'Root',
        pageIndex: 0,
        children: [{ title: 'Child', pageIndex: 1, children: [] }],
      },
    ]);
  });
});

describe('writeFlatBookmarks', () => {
  it('writes a flat PDF outline with sibling links and catalog entries', () => {
    const assigned = new Map<unknown, unknown>();
    const catalog = new MockDict();
    const pdfDoc: PdfDocumentLike = {
      catalog,
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
      getPage: (index: number) => ({ ref: `page-${index}` }),
      getPages: () => [],
    };

    writeFlatBookmarks(
      pdfDoc,
      [
        { title: 'First', pageIndex: 0 },
        { title: 'Second', pageIndex: 2 },
      ],
      { PDFHexString, PDFName },
    );

    expect(catalog.get('Outlines')).toBe('ref-0');
    expect(catalog.get('PageMode')).toBe('UseOutlines');
    expect(assigned.size).toBe(3);

    const firstItem = expectMockDict(assigned.get('ref-1'));
    const secondItem = expectMockDict(assigned.get('ref-2'));
    const outlines = expectMockDict(assigned.get('ref-0'));

    expect(firstItem.get('Title')).toEqual({ text: 'First' });
    expect(firstItem.get('Next')).toBe('ref-2');
    expect(secondItem.get('Prev')).toBe('ref-1');
    expect(outlines.get('First')).toBe('ref-1');
    expect(outlines.get('Last')).toBe('ref-2');
    expect(outlines.get('Count')).toBe(2);
  });
});
