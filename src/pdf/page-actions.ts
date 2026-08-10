import {
  extractPdfPages,
  removePdfPages,
  reorderPdfPages,
  rotatePdfPagesToPortrait,
  type ExtractPagesResult,
  type PdfOperationResult,
  type PdfOperationDeps,
  type PdfRotationMode,
  type RemovePagesResult,
  type RotatePagesResult,
} from './operations';
import {
  getOptionalPageSelection,
  getPageRemovalSelection,
  getRequiredPageSelection,
} from '../utils/page-selection';

export type PageCountReader = (arrayBuffer: ArrayBuffer) => Promise<{ pageCount: number }>;

export type PageActionDeps = {
  getPageCountFromArrayBuffer: PageCountReader;
  operationDeps: PdfOperationDeps;
  extractPdfPages?: typeof extractPdfPages;
  removePdfPages?: typeof removePdfPages;
  reorderPdfPages?: typeof reorderPdfPages;
  rotatePdfPagesToPortrait?: typeof rotatePdfPagesToPortrait;
};

export type ExtractPagesActionResult =
  | { status: 'invalid-pages' }
  | { status: 'ok'; result: ExtractPagesResult };

export type RemovePagesActionResult =
  | { status: 'invalid-pages' }
  | { status: 'empty-removal' }
  | { status: 'ok'; result: RemovePagesResult };

export type RotatePagesActionResult =
  | { status: 'invalid-pages' }
  | { status: 'no-landscape-pages' }
  | { status: 'ok'; result: RotatePagesResult };

export type ReorderPagesActionResult =
  | { status: 'empty-order' }
  | { status: 'ok'; result: PdfOperationResult };

async function getPageCount(file: File, readPageCount: PageCountReader) {
  const arrayBuffer = await file.arrayBuffer();
  return (await readPageCount(arrayBuffer)).pageCount;
}

export async function extractPdfPagesFromText(
  file: File,
  pagesText: string,
  deps: PageActionDeps,
): Promise<ExtractPagesActionResult> {
  const pageCount = await getPageCount(file, deps.getPageCountFromArrayBuffer);
  const pageSelection = getRequiredPageSelection(pagesText, pageCount);

  if (pageSelection.kind !== 'valid') return { status: 'invalid-pages' };

  const runExtract = deps.extractPdfPages ?? extractPdfPages;
  return {
    status: 'ok',
    result: await runExtract(file, pageSelection.pages, deps.operationDeps),
  };
}

export async function removePdfPagesFromText(
  file: File,
  pagesText: string,
  deps: PageActionDeps,
): Promise<RemovePagesActionResult> {
  const pageCount = await getPageCount(file, deps.getPageCountFromArrayBuffer);
  const pageSelection = getRequiredPageSelection(pagesText, pageCount);

  if (pageSelection.kind !== 'valid') return { status: 'invalid-pages' };

  const pageRemovalSelection = getPageRemovalSelection(pageCount, pageSelection.pages);
  if (!pageRemovalSelection.canRemove) return { status: 'empty-removal' };

  const runRemove = deps.removePdfPages ?? removePdfPages;
  return {
    status: 'ok',
    result: await runRemove(
      file,
      pageRemovalSelection.pagesToKeep,
      pageRemovalSelection.removedPageCount,
      deps.operationDeps,
    ),
  };
}

export async function reorderPdfPagesFromOrder(
  file: File,
  pageIndices: number[],
  deps: PageActionDeps,
): Promise<ReorderPagesActionResult> {
  if (pageIndices.length === 0) return { status: 'empty-order' };

  const runReorder = deps.reorderPdfPages ?? reorderPdfPages;
  return {
    status: 'ok',
    result: await runReorder(file, pageIndices, deps.operationDeps),
  };
}

export async function rotatePdfPagesFromText(
  file: File,
  pagesText: string,
  deps: PageActionDeps,
  mode: PdfRotationMode = 'auto',
): Promise<RotatePagesActionResult> {
  const pageCount = await getPageCount(file, deps.getPageCountFromArrayBuffer);
  const pageSelection = getOptionalPageSelection(pagesText, pageCount);

  if (pageSelection.kind === 'invalid') return { status: 'invalid-pages' };

  const runRotate = deps.rotatePdfPagesToPortrait ?? rotatePdfPagesToPortrait;
  const result = await runRotate(file, pageSelection.pages, deps.operationDeps, mode);

  return result.rotatedCount > 0
    ? { status: 'ok', result }
    : { status: 'no-landscape-pages' };
}
