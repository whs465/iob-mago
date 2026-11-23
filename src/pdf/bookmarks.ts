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
  size?(): number;
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

function readNamedDestinations(pdfDoc: PdfDocumentLike, PDFName: PdfLibBookmarkDeps['PDFName']) {
  const destinations = new Map<string, unknown>();
  const names = getPdfDictValue(pdfDoc, pdfDoc.catalog, 'Names', PDFName);
  const root = getPdfDictValue(pdfDoc, names, 'Dests', PDFName);
  const pending = root ? [root] : [];
  const visited = new Set<PdfDictLike>();
  while (pending.length) {
    const node = pending.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    const entries = getPdfDictValue(pdfDoc, node, 'Names', PDFName) as PdfArrayLike | null;
    const entryCount = entries?.size?.() ?? 0;
    for (let index = 0; index + 1 < entryCount; index += 2) {
      const key = getPdfArrayValue(pdfDoc, entries, index);
      if (hasDecodeText(key)) destinations.set(key.decodeText(), entries.get(index + 1));
    }
    const children = getPdfDictValue(pdfDoc, node, 'Kids', PDFName) as PdfArrayLike | null;
    const childCount = children?.size?.() ?? 0;
    for (let index = 0; index < childCount; index += 1) {
      const child = getPdfArrayValue(pdfDoc, children, index);
      if (hasGet(child)) pending.push(child as PdfDictLike);
    }
  }
  const legacy = getPdfDictValue(pdfDoc, pdfDoc.catalog, 'Dests', PDFName);
  return (name: string) => destinations.get(name) ?? getPdfRawDictValue(legacy, name, PDFName);
}

function extractPdfDestPageIndex(
  pdfDoc: PdfDocumentLike,
  destValue: unknown,
  pageRefIndexMap: Map<string, number>,
  resolveNamedDestination: (name: string) => unknown,
  PDFName: PdfLibBookmarkDeps['PDFName'],
) {
  let dest = destValue ? pdfDoc.context.lookup(destValue) : null;
  if (hasDecodeText(dest)) {
    const named = resolveNamedDestination(dest.decodeText());
    dest = named ? pdfDoc.context.lookup(named) : null;
    if (hasGet(dest)) {
      const wrapped = getPdfRawDictValue(dest as PdfDictLike, 'D', PDFName);
      if (wrapped) dest = pdfDoc.context.lookup(wrapped);
    }
  }
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
  resolveNamedDestination: (name: string) => unknown,
  PDFName: PdfLibBookmarkDeps['PDFName'],
) {
  const directDest = getPdfRawDictValue(itemDict, 'Dest', PDFName);
  const directPageIndex = extractPdfDestPageIndex(pdfDoc, directDest, pageRefIndexMap, resolveNamedDestination, PDFName);
  if (directPageIndex !== null && directPageIndex >= 0) return directPageIndex;

  const actionDict = getPdfDictValue(pdfDoc, itemDict, 'A', PDFName);
  const actionType = getPdfRawDictValue(actionDict, 'S', PDFName)?.toString?.();
  if (actionType && actionType !== '/GoTo') return null;

  return extractPdfDestPageIndex(
    pdfDoc, getPdfRawDictValue(actionDict, 'D', PDFName), pageRefIndexMap, resolveNamedDestination, PDFName,
  );
}

function extractPdfBookmarkSiblings(
  pdfDoc: PdfDocumentLike,
  firstItem: unknown,
  pageRefIndexMap: Map<string, number>,
  resolveNamedDestination: (name: string) => unknown,
  PDFName: PdfLibBookmarkDeps['PDFName'],
  visited: Set<unknown>,
): BookmarkNode[] {
  const bookmarks: BookmarkNode[] = [];
  let current: unknown = firstItem ? pdfDoc.context.lookup(firstItem) : null;

  while (hasGet(current) && !visited.has(current)) {
    visited.add(current);

    const title = decodePdfBookmarkTitle(getPdfRawDictValue(current, 'Title', PDFName));
    const pageIndex = extractPdfBookmarkPageIndex(pdfDoc, current, pageRefIndexMap, resolveNamedDestination, PDFName);
    const children = extractPdfBookmarkSiblings(
      pdfDoc,
      getPdfRawDictValue(current, 'First', PDFName),
      pageRefIndexMap,
      resolveNamedDestination,
      PDFName,
      visited,
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

  return extractPdfBookmarkSiblings(
    pdfDoc, firstItem, pageRefIndexMap, readNamedDestinations(pdfDoc, PDFName), PDFName, new Set(),
  );
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

  return flattenOffsetBookmarks(bookmarks, 0).flatMap(bookmark => {
    const pageIndex = pageIndexMap.get(bookmark.pageIndex);
    return pageIndex === undefined ? [] : [{ title: bookmark.title, pageIndex }];
  });
}

export function writeFlatBookmarks(
  pdfDoc: PdfDocumentLike,
  bookmarkEntries: BookmarkEntry[],
  { PDFHexString, PDFName }: PdfLibBookmarkDeps,
) {
  const entries = bookmarkEntries.filter(entry => Number.isInteger(entry.pageIndex) && entry.pageIndex >= 0)
    .sort((a, b) => a.pageIndex - b.pageIndex);
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
