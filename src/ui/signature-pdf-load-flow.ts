import type { LoadedSignaturePdf } from '../pdf/signature-pdf-load';
import type { SignatureMarkerState } from '../state/signature-markers';
import type { SignatureViewerState } from '../state/signature-viewer';
import type { StatusType } from './dom';
import { showSignaturePdfViewer } from './signature-viewer';
import { updateSignPdfLabel, type SignatureMetaTranslator } from './signature-preview';

export type LoadSignaturePdfFlowOptions = {
  file: File;
  viewerState: SignatureViewerState;
  markerState: SignatureMarkerState;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  loadPdfDocument(file: File): Promise<LoadedSignaturePdf>;
  renderPage(pageNumber: number): Promise<void>;
  updateMarkersDisplay(): void;
  updateSignatureList(): void;
  showViewer?: typeof showSignaturePdfViewer;
  updatePdfLabel?: typeof updateSignPdfLabel;
  logError?: (error: unknown) => void;
};

export type LoadSignaturePdfFlowResult =
  | { status: 'ok'; totalPages: number }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function loadSignaturePdfFlow({
  file,
  viewerState,
  markerState,
  i18n,
  showStatus,
  loadPdfDocument,
  renderPage,
  updateMarkersDisplay,
  updateSignatureList,
  showViewer = showSignaturePdfViewer,
  updatePdfLabel = updateSignPdfLabel,
  logError = console.error,
}: LoadSignaturePdfFlowOptions): Promise<LoadSignaturePdfFlowResult> {
  showStatus(i18n('Loading PDF...', 'Cargando PDF...'), 'processing');

  try {
    markerState.clear();
    updateMarkersDisplay();
    updateSignatureList();

    const loadedPdf = await loadPdfDocument(file);
    viewerState.load(loadedPdf.file, loadedPdf.pdfDocProxy, loadedPdf.totalPages);

    showViewer();
    updatePdfLabel(file.name, true);

    await renderPage(viewerState.currentPage);
    showStatus(
      i18n('PDF loaded: {{count}} page(s)', 'PDF cargado: {{count}} página(s)', {
        count: String(viewerState.totalPages),
      }),
      'success',
    );

    return { status: 'ok', totalPages: viewerState.totalPages };
  } catch (error) {
    logError(error);
    viewerState.clearLoadedPdf();
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error loading PDF: {{message}}', 'Error al cargar PDF: {{message}}', { message }),
      'error',
    );

    return { status: 'error', message };
  }
}
