import { emptyPdfMetadata, getPdfMetadata, writePdfMetadata, type EditablePdfMetadata, type PdfMetadataDeps } from '../pdf/metadata';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import { getElement, getInputValue, setInputValue, type StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

const fieldIds: Record<keyof EditablePdfMetadata, string> = {
  title: 'metadata-title', author: 'metadata-author', subject: 'metadata-subject',
  keywords: 'metadata-keywords', creator: 'metadata-creator', producer: 'metadata-producer',
};

export function readMetadataForm(): EditablePdfMetadata {
  return Object.fromEntries(Object.entries(fieldIds).map(([field, id]) => [field, getInputValue(id)])) as EditablePdfMetadata;
}

export function formatMetadataDates(
  creationDate?: Date | null,
  modificationDate?: Date | null,
  locale = 'es',
) {
  const isEnglish = locale.toLowerCase().startsWith('en');
  const formatDate = (value: Date) => new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);

  if (!creationDate && !modificationDate) {
    return isEnglish ? 'No dates recorded' : 'Sin fechas registradas';
  }

  if (creationDate && modificationDate && creationDate.getTime() === modificationDate.getTime()) {
    return `${isEnglish ? 'Created and modified' : 'Creado y modificado'}: ${formatDate(creationDate)}`;
  }

  const parts: string[] = [];
  if (creationDate) parts.push(`${isEnglish ? 'Created' : 'Creado'}: ${formatDate(creationDate)}`);
  if (modificationDate) parts.push(`${isEnglish ? 'Modified' : 'Modificado'}: ${formatDate(modificationDate)}`);
  return parts.join(' · ');
}

export function renderMetadataForm(metadata: EditablePdfMetadata & { creationDate?: Date | null; modificationDate?: Date | null }, locale = 'es') {
  Object.entries(fieldIds).forEach(([field, id]) => setInputValue(id, metadata[field as keyof EditablePdfMetadata]));
  const dates = getElement('metadata-dates');
  if (dates) dates.textContent = formatMetadataDates(metadata.creationDate, metadata.modificationDate, locale);
  getElement('metadata-editor')?.removeAttribute('hidden');
}

type MetadataFlowOptions = {
  file: File | null | undefined;
  isCurrentFile?(file: File): boolean;
  deps: PdfMetadataDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): (() => void) | null;
  saveAs(blob: Blob, filename: string): void;
};

export async function loadPdfMetadataFlow(options: Omit<MetadataFlowOptions, 'saveAs'>) {
  if (!options.file) {
    options.showStatus(options.i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' as const };
  }
  const finish = options.setActionBusy('metadata-load-action', options.i18n('Reading...', 'Leyendo...'));
  if (!finish) return { status: 'busy' as const };
  try {
    const metadata = await getPdfMetadata(options.file, options.deps);
    if (options.isCurrentFile && !options.isCurrentFile(options.file)) {
      return { status: 'stale' as const };
    }
    renderMetadataForm(metadata, options.i18n('en-GB', 'es-CO'));
    options.showStatus(options.i18n('Metadata loaded', 'Metadatos cargados'), 'success');
    return { status: 'success' as const, metadata };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.showStatus(options.i18n('Could not read metadata: {{message}}', 'No se pudieron leer los metadatos: {{message}}', { message }), 'error');
    return { status: 'error' as const, message };
  } finally { finish(); }
}

export async function savePdfMetadataFlow(options: MetadataFlowOptions, clear = false) {
  if (!options.file) {
    options.showStatus(options.i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return { status: 'missing-file' as const };
  }
  const buttonId = clear ? 'metadata-clear-action' : 'metadata-save-action';
  const finish = options.setActionBusy(buttonId, options.i18n('Saving...', 'Guardando...'));
  if (!finish) return { status: 'busy' as const };
  try {
    const metadata = clear ? emptyPdfMetadata() : readMetadataForm();
    const bytes = await writePdfMetadata(options.file, metadata, options.deps);
    if (options.isCurrentFile && !options.isCurrentFile(options.file)) {
      return { status: 'stale' as const };
    }
    const suffix = clear ? options.i18n('-metadata-cleared.pdf', '-sin-metadatos.pdf') : options.i18n('-metadata.pdf', '-metadatos.pdf');
    const filename = `${getPdfBaseName(options.file.name)}${suffix}`;
    options.saveAs(pdfBytesToBlob(bytes), filename);
    if (clear) renderMetadataForm(metadata, options.i18n('en-GB', 'es-CO'));
    options.showStatus(clear
      ? options.i18n('Descriptive metadata removed', 'Metadatos descriptivos eliminados')
      : options.i18n('Metadata updated', 'Metadatos actualizados'), 'success');
    return { status: 'success' as const, filename };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.showStatus(options.i18n('Could not save metadata: {{message}}', 'No se pudieron guardar los metadatos: {{message}}', { message }), 'error');
    return { status: 'error' as const, message };
  } finally { finish(); }
}
