import { splitPdfFileAction, type SplitPdfActionResult } from '../pdf/split-action';
import { downloadSplitPdfResult } from '../pdf/split-download';
import type { PdfOperationDeps, SplitPdfResult } from '../pdf/operations';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type SplitPdfBusyHandler = (() => void) | null;

export type SplitPdfFlowOptions = {
  file: File | null | undefined;
  asZip: boolean;
  operationDeps: PdfOperationDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): SplitPdfBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  JSZipCtor: new () => {
    file(name: string, data: Uint8Array | ArrayBuffer | Blob): unknown;
    generateAsync(options: { type: 'blob' }): Promise<Blob>;
  };
  splitAction?: typeof splitPdfFileAction;
  downloadResult?: typeof downloadSplitPdfResult;
  logError?: (error: unknown) => void;
};

export type SplitPdfFlowResult =
  | { status: 'busy' }
  | { status: 'missing-file' }
  | { status: 'success'; pageCount: number }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function splitPdfFlow({
  file,
  asZip,
  operationDeps,
  i18n,
  showStatus,
  setActionBusy,
  saveAs,
  JSZipCtor,
  splitAction = splitPdfFileAction,
  downloadResult = downloadSplitPdfResult,
  logError = console.error,
}: SplitPdfFlowOptions): Promise<SplitPdfFlowResult> {
  if (!file) {
    showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' };
  }

  const finishProcessing = setActionBusy(
    'split-action',
    i18n('Splitting...', 'Separando...'),
  );
  if (!finishProcessing) return { status: 'busy' };

  showStatus(i18n('Processing...', 'Procesando...'), 'processing');

  try {
    const action: SplitPdfActionResult = await splitAction(file, {
      operationDeps,
    });

    if (action.status === 'missing-file') {
      showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
      return { status: 'missing-file' };
    }

    const result: SplitPdfResult = action.result;
    await downloadResult(result, {
      asZip,
      sourceFilename: file.name,
      zipSuffix: i18n('-split.zip', '-separado.zip'),
      pagePrefix: i18n('page', 'pagina'),
      JSZipCtor,
      saveAs,
    });

    showStatus(
      i18n('PDF split into {{count}} pages!', '¡PDF separado en {{count}} páginas!', {
        count: String(result.pageCount),
      }),
      'success',
    );

    return { status: 'success', pageCount: result.pageCount };
  } catch (error) {
    logError(error);
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error splitting PDF: {{message}}', 'Error al separar PDF: {{message}}', {
        message,
      }),
      'error',
    );
    return { status: 'error', message };
  } finally {
    finishProcessing();
  }
}
