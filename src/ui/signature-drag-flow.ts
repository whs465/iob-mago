import { dragSignatureMarker, stopSignatureMarkerDrag } from '../state/signature-drag-action';
import type { SignatureDragState } from '../state/signature-drag';
import type { SignatureMarkerState } from '../state/signature-markers';
import type { PdfPageMetrics } from '../utils/signature-geometry';
import type { MarkerPositionResolver } from '../state/signature-drag-action';

export type HandleSignatureDragFlowOptions = {
  event: MouseEvent;
  canvas: HTMLCanvasElement;
  pdfPage: PdfPageMetrics;
  aspectRatio: number;
  dragState: SignatureDragState;
  markerState: SignatureMarkerState;
  getMarkerPdfPositionFromCanvas: MarkerPositionResolver;
  updateMarkersDisplay(): void;
};

export function handleSignatureDragFlow({
  event,
  canvas,
  pdfPage,
  aspectRatio,
  dragState,
  markerState,
  getMarkerPdfPositionFromCanvas,
  updateMarkersDisplay,
}: HandleSignatureDragFlowOptions) {
  const result = dragSignatureMarker({
    event,
    canvas,
    pdfPage,
    aspectRatio,
    dragState,
    markerState,
    getMarkerPdfPositionFromCanvas,
  });

  if (result.status === 'moved') updateMarkersDisplay();
  return result;
}

export type StopSignatureDragFlowOptions = {
  dragState: SignatureDragState;
  updateMarkersDisplay(): void;
  updateSignatureList(): void;
  bodyStyle: CSSStyleDeclaration;
};

export function stopSignatureDragFlow({
  dragState,
  updateMarkersDisplay,
  updateSignatureList,
  bodyStyle,
}: StopSignatureDragFlowOptions) {
  const result = stopSignatureMarkerDrag(dragState);
  if (result.status === 'inactive') return result;

  bodyStyle.userSelect = '';
  updateMarkersDisplay();

  if (result.movedDuringDrag) {
    updateSignatureList();
  }

  return result;
}
