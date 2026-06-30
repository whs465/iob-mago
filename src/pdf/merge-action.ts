import { mergePdfFiles, type PdfOperationDeps, type PdfOperationResult } from './operations';

export type MergePdfActionDeps = {
  addFileBookmarks: boolean;
  operationDeps: PdfOperationDeps;
  mergePdfFiles?: typeof mergePdfFiles;
  onFileProcessing?: (file: File) => void;
};

export type MergePdfActionResult =
  | { status: 'not-enough-files' }
  | { status: 'ok'; result: PdfOperationResult };

export async function mergePdfFilesAction(
  files: File[],
  deps: MergePdfActionDeps,
): Promise<MergePdfActionResult> {
  if (files.length < 2) return { status: 'not-enough-files' };

  const runMerge = deps.mergePdfFiles ?? mergePdfFiles;
  return {
    status: 'ok',
    result: await runMerge(files, {
      addFileBookmarks: deps.addFileBookmarks,
      deps: deps.operationDeps,
      onFileProcessing: deps.onFileProcessing,
    }),
  };
}
