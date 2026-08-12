import { compressPdf, type CompressionMode, type CompressPdfDeps } from '../pdf/compress';
import { getPdfBaseName } from '../utils/filenames';
import { formatFileSize, getSizeReduction } from '../utils/file-size';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import { getElement, type StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type CompressPdfFlowOptions = {
  file: File | null | undefined;
  mode: CompressionMode;
  deps: CompressPdfDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): (() => void) | null;
  saveAs(blob: Blob, filename: string): void;
  compressAction?: typeof compressPdf;
  logError?: (error: unknown) => void;
};

function reportCompressionStatus(
  message: string,
  type: StatusType,
  showStatus: CompressPdfFlowOptions['showStatus'],
) {
  const inlineStatus = getElement('compress-status');
  if (inlineStatus) {
    inlineStatus.textContent = message;
    inlineStatus.classList.remove('tool-status-processing', 'tool-status-success', 'tool-status-error');
    inlineStatus.classList.add(`tool-status-${type}`);
    inlineStatus.setAttribute('role', type === 'error' ? 'alert' : 'status');
    inlineStatus.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  }
  showStatus(message, type);
}

export async function compressPdfFlow(options: CompressPdfFlowOptions) {
  const { file, mode, deps, i18n, showStatus, setActionBusy, saveAs } = options;
  if (!file) {
    reportCompressionStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error', showStatus);
    return { status: 'missing-file' as const };
  }

  const finish = setActionBusy('compress-action', i18n('Compressing...', 'Comprimiendo...'));
  if (!finish) return { status: 'busy' as const };

  try {
    reportCompressionStatus(i18n('Preparing compression...', 'Preparando compresión...'), 'processing', showStatus);
    const result = await (options.compressAction ?? compressPdf)(file, mode, deps, (completed, total) => {
      reportCompressionStatus(i18n(
        'Compressing page {{completed}} of {{total}}...',
        'Comprimiendo página {{completed}} de {{total}}...',
        { completed: String(completed), total: String(total) },
      ), 'processing', showStatus);
    });
    const output = formatFileSize(result.outputSize, i18n('en-GB', 'es-CO'));
    if (result.keptOriginal) {
      const message = i18n(
        'This PDF is already smaller than the safe candidates for this mode ({{size}}). Nothing was downloaded.',
        'Este PDF ya es más pequeño que las alternativas seguras de este modo ({{size}}). No se descargó una copia idéntica.',
        { size: output },
      );
      reportCompressionStatus(message, 'error', showStatus);
      return { status: 'no-reduction' as const, ...result };
    }

    const modeSuffix = {
      safe: i18n('-compressed-safe.pdf', '-comprimido-seguro.pdf'),
      balanced: i18n('-compressed-balanced.pdf', '-comprimido-equilibrado.pdf'),
      compact: i18n('-compressed-compact.pdf', '-comprimido-compacto.pdf'),
    }[mode];
    const filename = `${getPdfBaseName(file.name)}${modeSuffix}`;
    saveAs(pdfBytesToBlob(result.pdfBytes), filename);

    const reduction = getSizeReduction(result.originalSize, result.outputSize);
    const original = formatFileSize(result.originalSize, i18n('en-GB', 'es-CO'));
    const message = i18n(
      'Done: {{original}} → {{output}} ({{reduction}}% smaller).',
      'Listo: {{original}} → {{output}} ({{reduction}}% menos).',
      { original, output, reduction: String(reduction) },
    );
    reportCompressionStatus(message, 'success', showStatus);
    return { status: 'success' as const, filename, ...result };
  } catch (error) {
    (options.logError ?? console.error)(error);
    const message = error instanceof Error ? error.message : String(error);
    reportCompressionStatus(
      i18n('Error compressing PDF: {{message}}', 'Error al comprimir PDF: {{message}}', { message }),
      'error',
      showStatus,
    );
    return { status: 'error' as const, message };
  } finally {
    finish();
  }
}
