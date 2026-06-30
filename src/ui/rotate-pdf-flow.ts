import { rotatePdfPagesFromText, type PageActionDeps, type RotatePagesActionResult } from '../pdf/page-actions';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type RotatePdfBusyHandler = (() => void) | null;

export type RotatePdfFlowOptions = {
  file: File | null | undefined;
  pagesText: string;
  deps: PageActionDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): RotatePdfBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  rotateAction?: typeof rotatePdfPagesFromText;
  logError?: (error: unknown) => void;
};

export type RotatePdfFlowResult =
  | { status: 'busy' }
  | { status: 'missing-file' }
  | { status: 'invalid-pages' }
  | { status: 'no-landscape-pages' }
  | { status: 'success'; filename: string; rotatedCount: number; rasterizedFiles: string[] }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function rotatePdfFlow({
  file,
  pagesText,
  deps,
  i18n,
  showStatus,
  setActionBusy,
  saveAs,
  rotateAction = rotatePdfPagesFromText,
  logError = console.error,
}: RotatePdfFlowOptions): Promise<RotatePdfFlowResult> {
  if (!file) {
    showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' };
  }

  const finishProcessing = setActionBusy(
    'rotate-action',
    i18n('Rotating...', 'Rotando...'),
  );
  if (!finishProcessing) return { status: 'busy' };

  showStatus(i18n('Processing...', 'Procesando...'), 'processing');

  try {
    const action: RotatePagesActionResult = await rotateAction(file, pagesText, deps);

    if (action.status === 'invalid-pages') {
      showStatus(i18n('No valid pages were found', 'No se encontraron páginas válidas'), 'error');
      return { status: 'invalid-pages' };
    }

    if (action.status === 'no-landscape-pages') {
      showStatus(
        i18n(
          'No landscape pages were found in the selected range',
          'No se encontraron páginas horizontales en el rango seleccionado',
        ),
        'error',
      );
      return { status: 'no-landscape-pages' };
    }

    const result = action.result;
    const filename = getPdfBaseName(file.name) + i18n('-portrait.pdf', '-vertical.pdf');
    saveAs(pdfBytesToBlob(result.pdfBytes), filename);
    showStatus(
      result.rasterizedFiles.length > 0
        ? i18n(
            '{{count}} page(s) rotated to portrait. Protected pages were flattened as images.',
            '{{count}} página(s) rotada(s) a vertical. Las páginas protegidas se aplanaron como imágenes.',
            { count: String(result.rotatedCount) },
          )
        : i18n(
            '{{count}} page(s) rotated to portrait!',
            '¡{{count}} página(s) rotada(s) a vertical!',
            { count: String(result.rotatedCount) },
          ),
      'success',
    );

    return {
      status: 'success',
      filename,
      rotatedCount: result.rotatedCount,
      rasterizedFiles: result.rasterizedFiles,
    };
  } catch (error) {
    logError(error);
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error rotating PDF: {{message}}', 'Error al rotar PDF: {{message}}', { message }),
      'error',
    );
    return { status: 'error', message };
  } finally {
    finishProcessing();
  }
}
