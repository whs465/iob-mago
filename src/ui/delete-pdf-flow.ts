import { removePdfPagesFromText, type PageActionDeps, type RemovePagesActionResult } from '../pdf/page-actions';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type DeletePdfBusyHandler = (() => void) | null;

export type DeletePdfFlowOptions = {
  file: File | null | undefined;
  pagesText: string;
  deps: PageActionDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): DeletePdfBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  removeAction?: typeof removePdfPagesFromText;
  logError?: (error: unknown) => void;
};

export type DeletePdfFlowResult =
  | { status: 'busy' }
  | { status: 'missing-file' }
  | { status: 'missing-pages' }
  | { status: 'invalid-pages' }
  | { status: 'empty-removal' }
  | { status: 'success'; filename: string; removedPageCount: number }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function deletePdfFlow({
  file,
  pagesText,
  deps,
  i18n,
  showStatus,
  setActionBusy,
  saveAs,
  removeAction = removePdfPagesFromText,
  logError = console.error,
}: DeletePdfFlowOptions): Promise<DeletePdfFlowResult> {
  if (!file) {
    showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' };
  }

  if (!pagesText) {
    showStatus(i18n('Enter the pages to remove', 'Ingresa las páginas a eliminar'), 'error');
    return { status: 'missing-pages' };
  }

  const finishProcessing = setActionBusy(
    'delete-action',
    i18n('Removing...', 'Eliminando...'),
  );
  if (!finishProcessing) return { status: 'busy' };

  showStatus(i18n('Processing...', 'Procesando...'), 'processing');

  try {
    const action: RemovePagesActionResult = await removeAction(file, pagesText, deps);

    if (action.status === 'invalid-pages') {
      showStatus(i18n('No valid pages were found', 'No se encontraron páginas válidas'), 'error');
      return { status: 'invalid-pages' };
    }

    if (action.status === 'empty-removal') {
      showStatus(
        i18n('At least one page must remain in the PDF', 'Debe quedar al menos una página en el PDF'),
        'error',
      );
      return { status: 'empty-removal' };
    }

    const filename = getPdfBaseName(file.name) + i18n('-pages-removed.pdf', '-sin-paginas.pdf');
    saveAs(pdfBytesToBlob(action.result.pdfBytes), filename);
    showStatus(
      i18n(
        '{{count}} page(s) removed successfully!',
        '¡{{count}} página(s) eliminada(s) exitosamente!',
        { count: String(action.result.removedPageCount) },
      ),
      'success',
    );

    return {
      status: 'success',
      filename,
      removedPageCount: action.result.removedPageCount,
    };
  } catch (error) {
    logError(error);
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error removing pages: {{message}}', 'Error al eliminar páginas: {{message}}', { message }),
      'error',
    );
    return { status: 'error', message };
  } finally {
    finishProcessing();
  }
}
