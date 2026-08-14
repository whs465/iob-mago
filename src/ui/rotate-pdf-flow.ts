import { rotatePdfPagesFromText, type PageActionDeps, type RotatePagesActionResult } from '../pdf/page-actions';
import type { PdfRotationMode } from '../pdf/operations';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import { downloadPdfOutputs, type PdfBatchOutput, type PdfBatchZipConstructor } from '../utils/pdf-batch-download';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type RotatePdfBusyHandler = (() => void) | null;

export type RotatePdfFlowOptions = {
  file: File | null | undefined;
  pagesText: string;
  mode?: PdfRotationMode;
  deps: PageActionDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): RotatePdfBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  rotateAction?: typeof rotatePdfPagesFromText;
  logError?: (error: unknown) => void;
};

export type RotatePdfBatchFlowOptions = Omit<RotatePdfFlowOptions, 'file'> & {
  files: File[];
  JSZipCtor?: PdfBatchZipConstructor;
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
  mode = 'auto',
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
    const action: RotatePagesActionResult = await rotateAction(file, pagesText, deps, mode);

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
    const filename = getPdfBaseName(file.name) + i18n('-rotated.pdf', '-girado.pdf');
    saveAs(pdfBytesToBlob(result.pdfBytes), filename);
    showStatus(
      result.rasterizedFiles.length > 0
        ? i18n(
            '{{count}} page(s) rotated. Protected pages were flattened as images.',
            '{{count}} página(s) girada(s). Las páginas protegidas se aplanaron como imágenes.',
            { count: String(result.rotatedCount) },
          )
        : i18n(
            '{{count}} page(s) rotated!',
            '¡{{count}} página(s) girada(s)!',
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

export async function rotatePdfBatchFlow(options: RotatePdfBatchFlowOptions) {
  if (options.files.length <= 1) return rotatePdfFlow({ ...options, file: options.files[0] });

  const finish = options.setActionBusy('rotate-action', options.i18n('Rotating...', 'Rotando...'));
  if (!finish) return { status: 'busy' as const };

  const outputs: PdfBatchOutput[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];
  let rotatedCount = 0;
  try {
    for (const [index, file] of options.files.entries()) {
      options.showStatus(options.i18n(
        'Rotating file {{completed}} of {{total}}: {{name}}',
        'Girando archivo {{completed}} de {{total}}: {{name}}',
        { completed: String(index + 1), total: String(options.files.length), name: file.name },
      ), 'processing');
      try {
        const action = await (options.rotateAction ?? rotatePdfPagesFromText)(
          file, options.pagesText, options.deps, options.mode ?? 'auto',
        );
        if (action.status !== 'ok') {
          skipped.push(file.name);
          continue;
        }
        rotatedCount += action.result.rotatedCount;
        outputs.push({
          filename: `${getPdfBaseName(file.name)}${options.i18n('-rotated.pdf', '-girado.pdf')}`,
          pdfBytes: action.result.pdfBytes,
        });
      } catch (error) {
        (options.logError ?? console.error)(error);
        failures.push(file.name);
      }
    }

    await downloadPdfOutputs(outputs, {
      JSZipCtor: options.JSZipCtor,
      zipFilename: options.i18n('rotated-pdfs.zip', 'pdfs-girados.zip'),
      saveAs: options.saveAs,
    });
    options.showStatus(options.i18n(
      'Batch complete: {{success}} PDF(s), {{pages}} page(s) rotated, {{skipped}} skipped, {{failed}} failed.',
      'Lote terminado: {{success}} PDF(s), {{pages}} página(s) girada(s), {{skipped}} omitido(s) y {{failed}} con error.',
      {
        success: String(outputs.length), pages: String(rotatedCount),
        skipped: String(skipped.length), failed: String(failures.length),
      },
    ), outputs.length > 0 ? 'success' : 'error');
    return { status: outputs.length > 0 ? 'batch-success' as const : 'batch-empty' as const, outputs, skipped, failures, rotatedCount };
  } finally {
    finish();
  }
}
