import { addTextWatermark, type WatermarkPdfDeps } from '../pdf/watermark';
import { getPdfBaseName } from '../utils/filenames';
import { getOptionalPageSelection } from '../utils/page-selection';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type WatermarkPdfFlowOptions = {
  file: File | null | undefined;
  text: string;
  pagesText: string;
  opacity: number;
  fontSize: number;
  angle: number;
  deps: WatermarkPdfDeps & { getPageCountFromArrayBuffer(buffer: ArrayBuffer): Promise<{ pageCount: number }> };
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): (() => void) | null;
  saveAs(blob: Blob, filename: string): void;
  watermarkAction?: typeof addTextWatermark;
};

export async function watermarkPdfFlow(options: WatermarkPdfFlowOptions) {
  const { file, i18n, showStatus } = options;
  if (!file) {
    showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' as const };
  }
  if (!options.text.trim()) {
    showStatus(i18n('Enter the watermark text', 'Escribe el texto de la marca de agua'), 'error');
    return { status: 'missing-text' as const };
  }
  const finish = options.setActionBusy('watermark-action', i18n('Adding...', 'Agregando...'));
  if (!finish) return { status: 'busy' as const };
  try {
    const buffer = await file.arrayBuffer();
    const { pageCount } = await options.deps.getPageCountFromArrayBuffer(buffer.slice(0));
    const selection = getOptionalPageSelection(options.pagesText, pageCount);
    if (selection.kind === 'invalid') {
      showStatus(i18n('No valid pages were found', 'No se encontraron páginas válidas'), 'error');
      return { status: 'invalid-pages' as const };
    }
    const bytes = await (options.watermarkAction ?? addTextWatermark)(file, {
      text: options.text, opacity: options.opacity, fontSize: options.fontSize,
      angle: options.angle, pageIndices: selection.pages,
    }, options.deps);
    const filename = `${getPdfBaseName(file.name)}${i18n('-watermarked.pdf', '-marca-de-agua.pdf')}`;
    options.saveAs(pdfBytesToBlob(bytes), filename);
    showStatus(i18n('Watermark added successfully', 'Marca de agua agregada correctamente'), 'success');
    return { status: 'success' as const, filename };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showStatus(i18n('Error adding watermark: {{message}}', 'Error al agregar la marca de agua: {{message}}', { message }), 'error');
    return { status: 'error' as const, message };
  } finally { finish(); }
}
