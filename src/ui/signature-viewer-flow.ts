import type { SignatureDragState } from '../state/signature-drag';
import type { SignatureMarkerState } from '../state/signature-markers';
import type { SignatureViewerState } from '../state/signature-viewer';
import {
  clearPdfCanvas,
  hideSignaturePdfViewer,
  resetSignaturePageControls,
  resetSignatureZoomControls,
  syncSignatureMarkerLayerSize,
  type PageInfoFormatter,
  type ZoomInfoFormatter,
} from './signature-viewer';

export type ResetSignaturePdfViewerOptions = {
  viewerState: SignatureViewerState;
  markerState: SignatureMarkerState;
  dragState: SignatureDragState;
  formatPageInfo: PageInfoFormatter;
  formatZoomInfo: ZoomInfoFormatter;
  updateMarkersDisplay(): void;
  updateSignatureList(): void;
  clearCanvas?: typeof clearPdfCanvas;
  hideViewer?: typeof hideSignaturePdfViewer;
  resetPageControls?: typeof resetSignaturePageControls;
  resetZoomControls?: typeof resetSignatureZoomControls;
  syncMarkerLayerSize?: typeof syncSignatureMarkerLayerSize;
};

export function resetSignaturePdfViewer({
  viewerState,
  markerState,
  dragState,
  formatPageInfo,
  formatZoomInfo,
  updateMarkersDisplay,
  updateSignatureList,
  clearCanvas = clearPdfCanvas,
  hideViewer = hideSignaturePdfViewer,
  resetPageControls = resetSignaturePageControls,
  resetZoomControls = resetSignatureZoomControls,
  syncMarkerLayerSize = syncSignatureMarkerLayerSize,
}: ResetSignaturePdfViewerOptions) {
  viewerState.reset();
  markerState.clear();
  dragState.reset();

  clearCanvas();
  syncMarkerLayerSize(0, 0);
  hideViewer();
  resetPageControls(formatPageInfo);
  resetZoomControls(formatZoomInfo);

  updateMarkersDisplay();
  updateSignatureList();
}
