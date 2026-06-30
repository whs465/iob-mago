import { reorderPdfPagesFromOrder, type PageActionDeps, type ReorderPagesActionResult } from '../pdf/page-actions';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type ReorderPdfBusyHandler = (() => void) | null;

export type ReorderPdfFlowOptions = {
  file: File | null | undefined;
  pageIndices: number[];
  deps: Pick<PageActionDeps, 'getPageCountFromArrayBuffer' | 'operationDeps'>;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): ReorderPdfBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  reorderAction?: typeof reorderPdfPagesFromOrder;
  logError?: (error: unknown) => void;
};

export type ReorderPdfFlowResult =
  | { status: 'busy' }
  | { status: 'missing-file' }
  | { status: 'empty-order' }
  | { status: 'success'; filename: string; rasterizedFiles: string[] }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function reorderPdfFlow({
  file,
  pageIndices,
  deps,
  i18n,
  showStatus,
  setActionBusy,
  saveAs,
  reorderAction = reorderPdfPagesFromOrder,
  logError = console.error,
}: ReorderPdfFlowOptions): Promise<ReorderPdfFlowResult> {
  if (!file) {
    showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' };
  }

  if (pageIndices.length === 0) {
    showStatus(i18n('No pages were loaded', 'No se cargaron páginas'), 'error');
    return { status: 'empty-order' };
  }

  const finishProcessing = setActionBusy(
    'order-action',
    i18n('Reordering...', 'Ordenando...'),
  );
  if (!finishProcessing) return { status: 'busy' };

  showStatus(i18n('Processing...', 'Procesando...'), 'processing');

  try {
    const action: ReorderPagesActionResult = await reorderAction(file, pageIndices, deps);

    if (action.status === 'empty-order') {
      showStatus(i18n('No pages were loaded', 'No se cargaron páginas'), 'error');
      return { status: 'empty-order' };
    }

    const result = action.result;
    const filename = getPdfBaseName(file.name) + i18n('-reordered.pdf', '-ordenado.pdf');
    saveAs(pdfBytesToBlob(result.pdfBytes), filename);
    showStatus(
      result.rasterizedFiles.length > 0
        ? i18n(
            'PDF reordered successfully. Protected pages were flattened as images.',
            'PDF ordenado exitosamente. Las páginas protegidas se aplanaron como imágenes.',
          )
        : i18n('PDF reordered successfully!', '¡PDF ordenado exitosamente!'),
      'success',
    );

    return {
      status: 'success',
      filename,
      rasterizedFiles: result.rasterizedFiles,
    };
  } catch (error) {
    logError(error);
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error reordering PDF: {{message}}', 'Error al ordenar PDF: {{message}}', { message }),
      'error',
    );
    return { status: 'error', message };
  } finally {
    finishProcessing();
  }
}
