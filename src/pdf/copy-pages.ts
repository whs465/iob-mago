import {
  type BookmarkEntry,
  type BookmarkNode,
  extractPdfBookmarks,
  remapBookmarksToCopiedPages,
} from './bookmarks';

type PdfLibBookmarkDeps = Parameters<typeof extractPdfBookmarks>[1];

export type PdfDocumentLike = {
  copyPages(sourcePdf: SourcePdfLike, indices: number[]): Promise<unknown[]>;
  addPage(pageOrSize: unknown): { drawImage: (...args: unknown[]) => void };
  embedPng(dataUrl: string): Promise<{ width: number; height: number }>;
};

export type SourcePdfLike = Parameters<typeof extractPdfBookmarks>[0] & {
  getPageIndices(): number[];
};

export type AppendPdfPagesResult = {
  pageCount: number;
  rasterized: boolean;
  bookmarks: BookmarkNode[] | BookmarkEntry[];
};

export type AppendPdfFilePagesDeps = {
  loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<SourcePdfLike> | SourcePdfLike;
  isEncryptedPdfError(error: unknown): boolean;
  appendRenderedPdfPages(
    targetPdf: PdfDocumentLike,
    arrayBuffer: ArrayBuffer,
    pageIndices?: number[] | null,
  ): Promise<number>;
  bookmarkDeps: PdfLibBookmarkDeps;
};

export async function appendPdfFilePages(
  targetPdf: PdfDocumentLike,
  file: File,
  deps: AppendPdfFilePagesDeps,
  pageIndices: number[] | null = null,
): Promise<AppendPdfPagesResult> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const sourcePdf = await deps.loadPdfDocument(arrayBuffer);
    const indices = pageIndices || sourcePdf.getPageIndices();
    const sourceBookmarks = extractPdfBookmarks(sourcePdf, deps.bookmarkDeps);
    const bookmarks = pageIndices
      ? remapBookmarksToCopiedPages(sourceBookmarks, indices)
      : sourceBookmarks;
    const pages = await targetPdf.copyPages(sourcePdf, indices);
    pages.forEach(page => targetPdf.addPage(page));
    return { pageCount: indices.length, rasterized: false, bookmarks };
  } catch (error) {
    if (!deps.isEncryptedPdfError(error)) throw error;

    const pageCount = await deps.appendRenderedPdfPages(targetPdf, arrayBuffer, pageIndices);
    return { pageCount, rasterized: true, bookmarks: [] };
  }
}
