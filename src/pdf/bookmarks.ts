export type BookmarkNode = {
  title: string;
  pageIndex: number | null;
  children: BookmarkNode[];
};

export type BookmarkEntry = {
  title: string;
  pageIndex: number;
};

type PdfLibBookmarkDeps = {
  PDFHexString: {
    fromText(text: string): unknown;
  };
  PDFName: {
    of(name: string): unknown;
  };
};

export type PdfDocumentLike = {
  catalog: PdfDictLike;
  context: {
    lookup(value: unknown): unknown;
    nextRef(): unknown;
    obj(value: unknown): unknown;
    assign(ref: unknown, value: unknown): void;
  };
  getPage(index: number): {
    ref: unknown;
  };
  getPages(): Array<{
    ref: unknown;
    node: unknown;
  }>;
};

type PdfDictLike = {
  get?(name: unknown): unknown;
  set?(name: unknown, value: unknown): void;
};

type PdfCreatedDictLike = PdfDictLike & {
  set(name: unknown, value: unknown): void;
};

type PdfArrayLike = {
  get?(index: number): unknown;
};

type PdfTitleLike = {
  decodeText?: () => string;
  asString?: () => string;
};

function hasGet(value: unknown): value is Required<PdfArrayLike> {
  return typeof value === 'object'
    && value !== null
    && 'get' in value
    && typeof value.get === 'function';
}

function hasDecodeText(value: unknown): value is Required<Pick<PdfTitleLike, 'decodeText'>> {
  return typeof value === 'object'
    && value !== null
    && 'decodeText' in value
    && typeof value.decodeText === 'function';
}

function hasAsString(value: unknown): value is Required<Pick<PdfTitleLike, 'asString'>> {
  return typeof value === 'object'
    && value !== null
    && 'asString' in value
    && typeof value.asString === 'function';
}

function hasSet(value: unknown): value is PdfCreatedDictLike {
  return typeof value === 'object'
    && value !== null
    && 'set' in value
    && typeof value.set === 'function';
}

function expectCreatedPdfDict(value: unknown) {
  if (!hasSet(value)) {
    throw new Error('Expected pdf-lib context.obj() to create a mutable PDF dictionary.');
  }
  return value;
}

function getPdfDictValue(
  pdfDoc: PdfDocumentLike,
  dict: PdfDictLike | null | undefined,
  name: string,
  PDFName: PdfLibBookmarkDeps['PDFName'],
): PdfDictLike | null {
  if (!dict?.get) return null;
  const value = dict.get(PDFName.of(name));
  const resolvedValue = value ? pdfDoc.context.lookup(value) : null;
  return hasGet(resolvedValue) ? resolvedValue : null;
}

function getPdfRawDictValue(
  dict: PdfDictLike | null | undefined,
  name: string,
  PDFName: PdfLibBookmarkDeps['PDFName'],
): unknown {
  return dict?.get ? dict.get(PDFName.of(name)) : null;
}

function getPdfArrayValue(pdfDoc: PdfDocumentLike, array: PdfArrayLike | null | undefined, index: number) {
  if (!array?.get) return null;
  const value = array.get(index);
  return value ? pdfDoc.context.lookup(value) : null;
}

function decodePdfBookmarkTitle(titleValue: unknown) {
  if (!titleValue) return '';
  if (hasDecodeText(titleValue)) return titleValue.decodeText();
  if (hasAsString(titleValue)) return titleValue.asString();
  return String(titleValue).replace(/^\((.*)\)$/, '$1');
}

function extractPdfDestPageIndex(
  pdfDoc: PdfDocumentLike,
  destValue: unknown,
  pageRefIndexMap: Map<string, number>,
) {
  const dest = destValue ? pdfDoc.context.lookup(destValue) : null;
  if (!hasGet(dest)) return null;

  const pageRef = dest.get(0);
  const refKey = pageRef?.toString?.();
  if (refKey && pageRefIndexMap.has(refKey)) return pageRefIndexMap.get(refKey) ?? null;

  const page = getPdfArrayValue(pdfDoc, dest, 0);
  if (!page) return null;

  const pageIndex = pdfDoc.getPages().findIndex(sourcePage => sourcePage.node === page);
  return pageIndex >= 0 ? pageIndex : null;
}

function extractPdfBookmarkPageIndex(
  pdfDoc: PdfDocumentLike,
  itemDict: PdfDictLike,
  pageRefIndexMap: Map<string, number>,
  PDFName: PdfLibBookmarkDeps['PDFName'],
) {
  const directDest = getPdfRawDictValue(itemDict, 'Dest', PDFName);
  const directPageIndex = extractPdfDestPageIndex(pdfDoc, directDest, pageRefIndexMap);
  if (directPageIndex !== null && directPageIndex >= 0) return directPageIndex;

  const actionDict = getPdfDictValue(pdfDoc, itemDict, 'A', PDFName);
  const actionType = getPdfRawDictValue(actionDict, 'S', PDFName)?.toString?.();
  if (actionType && actionType !== '/GoTo') return null;

  return extractPdfDestPageIndex(pdfDoc, getPdfRawDictValue(actionDict, 'D', PDFName), pageRefIndexMap);
}

function extractPdfBookmarkSiblings(
  pdfDoc: PdfDocumentLike,
  firstItem: unknown,
  pageRefIndexMap: Map<string, number>,
  PDFName: PdfLibBookmarkDeps['PDFName'],
): BookmarkNode[] {
  const bookmarks: BookmarkNode[] = [];
  const visited = new Set<unknown>();
  let current: unknown = firstItem ? pdfDoc.context.lookup(firstItem) : null;

  while (hasGet(current) && !visited.has(current)) {
    visited.add(current);

    const title = decodePdfBookmarkTitle(getPdfRawDictValue(current, 'Title', PDFName));
    const pageIndex = extractPdfBookmarkPageIndex(pdfDoc, current, pageRefIndexMap, PDFName);
    const children = extractPdfBookmarkSiblings(
      pdfDoc,
      getPdfRawDictValue(current, 'First', PDFName),
      pageRefIndexMap,
      PDFName,
    );

    if (title || children.length > 0) {
      bookmarks.push({ title: title || 'Bookmark', pageIndex, children });
    }

    const next = getPdfRawDictValue(current, 'Next', PDFName);
    current = next ? pdfDoc.context.lookup(next) : null;
  }

  return bookmarks;
}

export function extractPdfBookmarks(
  pdfDoc: PdfDocumentLike,
  { PDFName }: Pick<PdfLibBookmarkDeps, 'PDFName'>,
): BookmarkNode[] {
  const outlines = getPdfDictValue(pdfDoc, pdfDoc.catalog, 'Outlines', PDFName);
  const firstItem = getPdfRawDictValue(outlines, 'First', PDFName);
  if (!firstItem) return [];

  const pageRefIndexMap = new Map<string, number>();
  pdfDoc.getPages().forEach((page, index) => {
    pageRefIndexMap.set(String(page.ref), index);
  });

  return extractPdfBookmarkSiblings(pdfDoc, firstItem, pageRefIndexMap, PDFName);
}

export function flattenOffsetBookmarks(bookmarks: BookmarkNode[], pageOffset: number): BookmarkEntry[] {
  return bookmarks.flatMap(bookmark => {
    const entries: BookmarkEntry[] = [];
    if (Number.isInteger(bookmark.pageIndex)) {
      entries.push({
        title: bookmark.title,
        pageIndex: bookmark.pageIndex + pageOffset,
      });
    }

    entries.push(...flattenOffsetBookmarks(bookmark.children || [], pageOffset));
    return entries;
  });
}

export function remapBookmarksToCopiedPages(
  bookmarks: BookmarkNode[],
  copiedPageIndices: number[],
): BookmarkEntry[] {
  const pageIndexMap = new Map<number, number>();
  copiedPageIndices.forEach((sourcePageIndex, targetPageIndex) => {
    if (!pageIndexMap.has(sourcePageIndex)) {
      pageIndexMap.set(sourcePageIndex, targetPageIndex);
    }
  });

  return bookmarks.flatMap(bookmark => {
    const entries: BookmarkEntry[] = [];
    if (Number.isInteger(bookmark.pageIndex) && pageIndexMap.has(bookmark.pageIndex)) {
      entries.push({
        title: bookmark.title,
        pageIndex: pageIndexMap.get(bookmark.pageIndex) as number,
      });
    }

    entries.push(...remapBookmarksToCopiedPages(bookmark.children || [], copiedPageIndices));
    return entries;
  });
}

export function writeFlatBookmarks(
  pdfDoc: PdfDocumentLike,
  bookmarkEntries: BookmarkEntry[],
  { PDFHexString, PDFName }: PdfLibBookmarkDeps,
) {
  const entries = bookmarkEntries.filter(entry => Number.isInteger(entry.pageIndex));
  if (entries.length === 0) return;

  const context = pdfDoc.context;
  const outlinesRef = context.nextRef();
  const itemRefs = entries.map(() => context.nextRef());

  entries.forEach((entry, index) => {
    const page = pdfDoc.getPage(entry.pageIndex);
    const itemDict = expectCreatedPdfDict(context.obj({
      Title: PDFHexString.fromText(entry.title),
      Parent: outlinesRef,
      Dest: context.obj([page.ref, PDFName.of('Fit')]),
    }));

    if (index > 0) {
      itemDict.set(PDFName.of('Prev'), itemRefs[index - 1]);
    }

    if (index < entries.length - 1) {
      itemDict.set(PDFName.of('Next'), itemRefs[index + 1]);
    }

    context.assign(itemRefs[index], itemDict);
  });

  const outlinesDict = context.obj({
    Type: PDFName.of('Outlines'),
    First: itemRefs[0],
    Last: itemRefs[itemRefs.length - 1],
    Count: entries.length,
  });

  context.assign(outlinesRef, outlinesDict);
  pdfDoc.catalog.set?.(PDFName.of('Outlines'), outlinesRef);
  pdfDoc.catalog.set?.(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}
