import { removePdfBookmarks } from '../pdf/remove-bookmarks';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import type { setActionBusy, showStatus } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

type RemoveBookmarksOptions = {
  file: File | undefined;
  i18n: SignatureMetaTranslator;
  showStatus: typeof showStatus;
  setActionBusy: typeof setActionBusy;
  saveAs(blob: Blob, filename: string): void;
};

export async function removeBookmarksFlow({ file, i18n, showStatus, setActionBusy, saveAs }: RemoveBookmarksOptions) {
  if (!file) {
    showStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error');
    return;
  }
  const finish = setActionBusy('remove-bookmarks-action', i18n('Removing…', 'Quitando…'));
  if (!finish) return;

  try {
    const bytes = await removePdfBookmarks(await file.arrayBuffer());
    if (!bytes) {
      showStatus(i18n('This PDF has no bookmarks', 'Este PDF no tiene marcadores'), 'success');
      return;
    }
    const suffix = i18n('-no-bookmarks.pdf', '-sin-marcadores.pdf');
    saveAs(pdfBytesToBlob(bytes), `${getPdfBaseName(file.name)}${suffix}`);
    showStatus(i18n('Copy downloaded without bookmarks', 'Copia descargada sin marcadores'), 'success');
  } catch {
    showStatus(i18n('Could not remove PDF bookmarks', 'No se pudieron quitar los marcadores del PDF'), 'error');
  } finally {
    finish();
  }
}
