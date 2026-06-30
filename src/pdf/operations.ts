import { type BookmarkEntry, type BookmarkNode, flattenOffsetBookmarks, writeFlatBookmarks } from './bookmarks';
import { appendPdfFilePages, type AppendPdfFilePagesDeps, type PdfDocumentLike } from './copy-pages';

type BookmarkWritablePdf = Parameters<typeof writeFlatBookmarks>[0];

type OperationPdfDocument = PdfDocumentLike & BookmarkWritablePdf & {
  getPageCount(): number;
  save(): Promise<Uint8Array>;
};

type PdfDocumentFactory = {
  create(): Promise<OperationPdfDocument>;
};

type BookmarkWriteDeps = Parameters<typeof writeFlatBookmarks>[2];

type RotatablePdfPage = {
  getSize(): { width: number; height: number };
  getRotation(): { angle: number };
  setRotation(rotation: unknown): void;
};

type RotatablePdfDocument = {
  getPageIndices(): number[];
  getPage(index: number): RotatablePdfPage;
  save(): Promise<Uint8Array>;
};

export type PdfOperationDeps = {
  PDFDocument: PdfDocumentFactory;
  pageCopyDeps: AppendPdfFilePagesDeps;
  bookmarkDeps: BookmarkWriteDeps;
  degrees(angle: number): unknown;
  buildRotatedPortraitPdfFromRenderedPages(
    arrayBuffer: ArrayBuffer,
    selectedPageIndices?: number[] | null,
  ): Promise<{ pdfBytes: Uint8Array; rotatedCount: number }>;
};

export type PdfOperationResult = {
  pdfBytes: Uint8Array;
  rasterizedFiles: string[];
};

export type RemovePagesResult = PdfOperationResult & {
  removedPageCount: number;
};

export type SplitPdfPage = {
  filename: string;
  pdfBytes: Uint8Array;
};

export type SplitPdfResult = {
  pages: SplitPdfPage[];
  pageCount: number;
};

export type ExtractPagesResult = PdfOperationResult & {
  extractedPageCount: number;
};

export type RotatePagesResult = PdfOperationResult & {
  rotatedCount: number;
};

function addMergedBookmarkEntries(
  bookmarkEntries: BookmarkEntry[],
  file: File,
  startPageIndex: number,
  result: Awaited<ReturnType<typeof appendPdfFilePages>>,
  addFileBookmark: boolean,
) {
  if (addFileBookmark && result.pageCount > 0) {
    bookmarkEntries.push({
      title: file.name.replace(/\.pdf$/i, ''),
      pageIndex: startPageIndex,
    });
  }

  const existingBookmarks = flattenOffsetBookmarks(result.bookmarks as BookmarkNode[], startPageIndex);
  bookmarkEntries.push(...existingBookmarks);
}

export async function mergePdfFiles(
  files: File[],
  {
    addFileBookmarks,
    deps,
    onFileProcessing,
  }: {
    addFileBookmarks: boolean;
    deps: PdfOperationDeps;
    onFileProcessing?: (file: File) => void;
  },
): Promise<PdfOperationResult> {
  const pdf = await deps.PDFDocument.create();
  const rasterizedFiles: string[] = [];
  const bookmarkEntries: BookmarkEntry[] = [];

  for (const file of files) {
    onFileProcessing?.(file);
    const startPageIndex = pdf.getPageCount();
    const result = await appendPdfFilePages(pdf, file, deps.pageCopyDeps);
    addMergedBookmarkEntries(bookmarkEntries, file, startPageIndex, result, addFileBookmarks);

    if (result.rasterized) rasterizedFiles.push(file.name);
  }

  if (bookmarkEntries.length > 0) {
    writeFlatBookmarks(pdf, bookmarkEntries, deps.bookmarkDeps);
  }

  return {
    pdfBytes: await pdf.save(),
    rasterizedFiles,
  };
}

export async function removePdfPages(
  file: File,
  pagesToKeep: number[],
  removedPageCount: number,
  deps: PdfOperationDeps,
): Promise<RemovePagesResult> {
  const pdf = await deps.PDFDocument.create();
  const result = await appendPdfFilePages(pdf, file, deps.pageCopyDeps, pagesToKeep);

  if (result.bookmarks.length > 0) {
    writeFlatBookmarks(pdf, result.bookmarks as BookmarkEntry[], deps.bookmarkDeps);
  }

  return {
    pdfBytes: await pdf.save(),
    rasterizedFiles: result.rasterized ? [file.name] : [],
    removedPageCount,
  };
}

export async function splitPdfIntoPages(
  file: File,
  deps: PdfOperationDeps,
): Promise<SplitPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await deps.pageCopyDeps.loadPdfDocument(arrayBuffer);
  const pageIndices = sourcePdf.getPageIndices();
  const pages: SplitPdfPage[] = [];

  for (const pageIndex of pageIndices) {
    const pdf = await deps.PDFDocument.create();
    const result = await appendPdfFilePages(pdf, file, deps.pageCopyDeps, [pageIndex]);

    if (result.bookmarks.length > 0) {
      writeFlatBookmarks(pdf, result.bookmarks as BookmarkEntry[], deps.bookmarkDeps);
    }

    pages.push({
      filename: `pagina-${String(pageIndex + 1).padStart(3, '0')}.pdf`,
      pdfBytes: await pdf.save(),
    });
  }

  return { pages, pageCount: pageIndices.length };
}

export async function extractPdfPages(
  file: File,
  pageIndices: number[],
  deps: PdfOperationDeps,
): Promise<ExtractPagesResult> {
  const pdf = await deps.PDFDocument.create();
  const result = await appendPdfFilePages(pdf, file, deps.pageCopyDeps, pageIndices);

  if (result.bookmarks.length > 0) {
    writeFlatBookmarks(pdf, result.bookmarks as BookmarkEntry[], deps.bookmarkDeps);
  }

  return {
    pdfBytes: await pdf.save(),
    rasterizedFiles: result.rasterized ? [file.name] : [],
    extractedPageCount: pageIndices.length,
  };
}

export async function reorderPdfPages(
  file: File,
  pageIndices: number[],
  deps: PdfOperationDeps,
): Promise<PdfOperationResult> {
  const pdf = await deps.PDFDocument.create();
  const result = await appendPdfFilePages(pdf, file, deps.pageCopyDeps, pageIndices);

  if (result.bookmarks.length > 0) {
    writeFlatBookmarks(pdf, result.bookmarks as BookmarkEntry[], deps.bookmarkDeps);
  }

  return {
    pdfBytes: await pdf.save(),
    rasterizedFiles: result.rasterized ? [file.name] : [],
  };
}

function normalizeRotationAngle(angle = 0) {
  const numericAngle = Number(angle) || 0;
  return ((numericAngle % 360) + 360) % 360;
}

function isLandscapePage(width: number, height: number, rotation = 0) {
  const normalizedRotation = normalizeRotationAngle(rotation);
  const visible = normalizedRotation % 180 === 0
    ? { width, height }
    : { width: height, height: width };
  return visible.width > visible.height;
}

export async function rotatePdfPagesToPortrait(
  file: File,
  pageIndices: number[] | null,
  deps: PdfOperationDeps,
): Promise<RotatePagesResult> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdf = await deps.pageCopyDeps.loadPdfDocument(arrayBuffer) as unknown as RotatablePdfDocument;
    const totalPages = pdf.getPageIndices().length;
    const indices = pageIndices || Array.from({ length: totalPages }, (_, index) => index);
    let rotatedCount = 0;

    indices.forEach(pageIndex => {
      const page = pdf.getPage(pageIndex);
      const { width, height } = page.getSize();
      const currentRotation = normalizeRotationAngle(page.getRotation().angle);

      if (!isLandscapePage(width, height, currentRotation)) return;

      page.setRotation(deps.degrees(normalizeRotationAngle(currentRotation + 90)));
      rotatedCount++;
    });

    return {
      pdfBytes: await pdf.save(),
      rasterizedFiles: [],
      rotatedCount,
    };
  } catch (error) {
    if (!deps.pageCopyDeps.isEncryptedPdfError(error)) throw error;

    const result = await deps.buildRotatedPortraitPdfFromRenderedPages(arrayBuffer, pageIndices);
    return {
      pdfBytes: result.pdfBytes,
      rasterizedFiles: [file.name],
      rotatedCount: result.rotatedCount,
    };
  }
}
