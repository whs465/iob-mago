import { extractPdfPagesFromText, type PageActionDeps, type ExtractPagesActionResult } from '../pdf/page-actions';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type ExtractPdfBusyHandler = (() => void) | null;

export type ExtractPdfFlowOptions = {
  file: File | null | undefined;
  pagesText: string;
  deps: PageActionDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): ExtractPdfBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  extractAction?: typeof extractPdfPagesFromText;
  logError?: (error: unknown) => void;
};

export type ExtractPdfFlowResult =
  | { status: 'busy' }
  | { status: 'missing-file' }
  | { status: 'missing-pages' }
  | { status: 'invalid-pages' }
  | { status: 'success'; filename: string; extractedPageCount: number }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function extractPdfFlow({
  file,
  pagesText,
  deps,
  i18n,
  showStatus,
  setActionBusy,
  saveAs,
  extractAction = extractPdfPagesFromText,
  logError = console.error,
}: ExtractPdfFlowOptions): Promise<ExtractPdfFlowResult> {
  if (!file) {
    showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' };
  }

  if (!pagesText) {
    showStatus(i18n('Enter the pages to extract', 'Ingresa las páginas a extraer'), 'error');
    return { status: 'missing-pages' };
  }

  const finishProcessing = setActionBusy(
    'extract-action',
    i18n('Extracting...', 'Extrayendo...'),
  );
  if (!finishProcessing) return { status: 'busy' };

  showStatus(i18n('Processing...', 'Procesando...'), 'processing');

  try {
    const action: ExtractPagesActionResult = await extractAction(file, pagesText, deps);

    if (action.status === 'invalid-pages') {
      showStatus(i18n('No valid pages were found', 'No se encontraron páginas válidas'), 'error');
      return { status: 'invalid-pages' };
    }

    const filename = getPdfBaseName(file.name) + i18n('-extracted.pdf', '-extraido.pdf');
    saveAs(pdfBytesToBlob(action.result.pdfBytes), filename);
    showStatus(
      i18n('{{count}} page(s) extracted successfully!', '¡{{count}} página(s) extraída(s) exitosamente!', {
        count: String(action.result.extractedPageCount),
      }),
      'success',
    );

    return {
      status: 'success',
      filename,
      extractedPageCount: action.result.extractedPageCount,
    };
  } catch (error) {
    logError(error);
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error extracting pages: {{message}}', 'Error al extraer páginas: {{message}}', { message }),
      'error',
    );
    return { status: 'error', message };
  } finally {
    finishProcessing();
  }
}
