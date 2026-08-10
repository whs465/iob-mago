import type { PdfOperationResult, RemovePagesResult, RotatePagesResult } from '../pdf/operations';

export type Translator = (
  english: string,
  spanish: string,
  values?: Record<string, string>,
) => string;

export function getMergeSuccessMessage(rasterizedFiles: string[], i18n: Translator) {
  return rasterizedFiles.length > 0
    ? i18n(
      'PDFs merged successfully. Protected files were flattened as images: {{files}}',
      'PDFs unidos exitosamente. Los archivos protegidos se aplanaron como imágenes: {{files}}',
      { files: rasterizedFiles.join(', ') },
    )
    : i18n('PDFs merged successfully!', '¡PDFs unidos exitosamente!');
}

export function getRemovePagesSuccessMessage(result: RemovePagesResult, i18n: Translator) {
  return result.rasterizedFiles.length > 0
    ? i18n(
      '{{count}} page(s) removed. Protected pages were flattened as images.',
      'Se eliminaron {{count}} página(s). Las páginas protegidas se aplanaron como imágenes.',
      { count: String(result.removedPageCount) },
    )
    : i18n(
      '{{count}} page(s) removed successfully!',
      '¡{{count}} página(s) eliminada(s) exitosamente!',
      { count: String(result.removedPageCount) },
    );
}

export function getReorderSuccessMessage(
  rasterizedFiles: PdfOperationResult['rasterizedFiles'],
  i18n: Translator,
) {
  return rasterizedFiles.length > 0
    ? i18n(
      'PDF reordered successfully. Protected pages were flattened as images.',
      'PDF ordenado exitosamente. Las páginas protegidas se aplanaron como imágenes.',
    )
    : i18n('PDF reordered successfully!', '¡PDF ordenado exitosamente!');
}

export function getRotatePagesSuccessMessage(result: RotatePagesResult, i18n: Translator) {
  return result.rasterizedFiles.length > 0
    ? i18n(
      '{{count}} page(s) rotated. Protected pages were flattened as images.',
      '{{count}} página(s) girada(s). Las páginas protegidas se aplanaron como imágenes.',
      { count: String(result.rotatedCount) },
    )
    : i18n(
      '{{count}} page(s) rotated!',
      '¡{{count}} página(s) girada(s)!',
      { count: String(result.rotatedCount) },
    );
}
