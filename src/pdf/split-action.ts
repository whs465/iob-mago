import { splitPdfIntoPages, type PdfOperationDeps, type SplitPdfResult } from './operations';

export type SplitPdfActionDeps = {
  operationDeps: PdfOperationDeps;
  splitPdfIntoPages?: typeof splitPdfIntoPages;
};

export type SplitPdfActionResult =
  | { status: 'missing-file' }
  | { status: 'ok'; result: SplitPdfResult };

export async function splitPdfFileAction(
  file: File | null | undefined,
  deps: SplitPdfActionDeps,
): Promise<SplitPdfActionResult> {
  if (!file) return { status: 'missing-file' };

  const runSplit = deps.splitPdfIntoPages ?? splitPdfIntoPages;
  return {
    status: 'ok',
    result: await runSplit(file, deps.operationDeps),
  };
}
