import { mergePdfFilesAction, type MergePdfActionResult } from '../pdf/merge-action';
import type { PdfOperationDeps } from '../pdf/operations';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import { getMergeSuccessMessage } from './pdf-status';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type MergePdfBusyHandler = (() => void) | null;

export type MergePdfFlowOptions = {
  files: File[];
  addFileBookmarks: boolean;
  operationDeps: PdfOperationDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): MergePdfBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  mergeAction?: typeof mergePdfFilesAction;
  logError?: (error: unknown) => void;
};

export type MergePdfFlowResult =
  | { status: 'busy' }
  | { status: 'not-enough-files' }
  | { status: 'success'; filename: string }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function mergePdfFlow({
  files,
  addFileBookmarks,
  operationDeps,
  i18n,
  showStatus,
  setActionBusy,
  saveAs,
  mergeAction = mergePdfFilesAction,
  logError = console.error,
}: MergePdfFlowOptions): Promise<MergePdfFlowResult> {
  if (files.length < 2) {
    showStatus(
      i18n('Select at least 2 PDF files', 'Selecciona al menos 2 archivos PDF'),
      'error',
    );
    return { status: 'not-enough-files' };
  }

  const finishProcessing = setActionBusy(
    'merge-action',
    i18n('Merging...', 'Uniendo...'),
  );
  if (!finishProcessing) return { status: 'busy' };

  showStatus(i18n('Processing...', 'Procesando...'), 'processing');

  try {
    const action: MergePdfActionResult = await mergeAction(files, {
      addFileBookmarks,
      operationDeps,
      onFileProcessing: file => {
        showStatus(
          i18n('Processing {{name}}...', 'Procesando {{name}}...', { name: file.name }),
          'processing',
        );
      },
    });

    if (action.status === 'not-enough-files') {
      showStatus(
        i18n('Select at least 2 PDF files', 'Selecciona al menos 2 archivos PDF'),
        'error',
      );
      return { status: 'not-enough-files' };
    }

    const blob = pdfBytesToBlob(action.result.pdfBytes);
    const filename = i18n('merged-document.pdf', 'documento-unido.pdf');
    saveAs(blob, filename);
    showStatus(getMergeSuccessMessage(action.result.rasterizedFiles, i18n), 'success');

    return { status: 'success', filename };
  } catch (error) {
    logError(error);
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error merging PDFs: {{message}}', 'Error al unir PDFs: {{message}}', { message }),
      'error',
    );
    return { status: 'error', message };
  } finally {
    finishProcessing();
  }
}
