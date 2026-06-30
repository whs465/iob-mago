import type { SignatureDragState } from '../state/signature-drag';
import type { SignatureMarkerState } from '../state/signature-markers';
import type { SignatureViewerState } from '../state/signature-viewer';
import { clearPdfCanvas, hideSignaturePdfViewer, resetSignaturePageControls, type PageInfoFormatter } from './signature-viewer';

export type ResetSignaturePdfViewerOptions = {
  viewerState: SignatureViewerState;
  markerState: SignatureMarkerState;
  dragState: SignatureDragState;
  formatPageInfo: PageInfoFormatter;
  updateMarkersDisplay(): void;
  updateSignatureList(): void;
  clearCanvas?: typeof clearPdfCanvas;
  hideViewer?: typeof hideSignaturePdfViewer;
  resetPageControls?: typeof resetSignaturePageControls;
};

export function resetSignaturePdfViewer({
  viewerState,
  markerState,
  dragState,
  formatPageInfo,
  updateMarkersDisplay,
  updateSignatureList,
  clearCanvas = clearPdfCanvas,
  hideViewer = hideSignaturePdfViewer,
  resetPageControls = resetSignaturePageControls,
}: ResetSignaturePdfViewerOptions) {
  viewerState.reset();
  markerState.clear();
  dragState.reset();

  clearCanvas();
  hideViewer();
  resetPageControls(formatPageInfo);

  updateMarkersDisplay();
  updateSignatureList();
}
