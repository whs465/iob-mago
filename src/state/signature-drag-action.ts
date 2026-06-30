import type { SignatureDragState } from './signature-drag';
import type { SignatureMarker, SignatureMarkerState } from './signature-markers';
import type { CanvasMetrics, PdfPageMetrics, Point } from '../utils/signature-geometry';

export type MarkerPositionResolver = (
  marker: SignatureMarker,
  point: Point,
  canvas: CanvasMetrics,
  pdfPage: PdfPageMetrics,
  aspectRatio: number,
) => Pick<SignatureMarker, 'x' | 'y' | 'canvasX' | 'canvasY'> | null;

export type DragSignatureMarkerOptions = {
  event: MouseEvent;
  canvas: HTMLCanvasElement;
  pdfPage: PdfPageMetrics;
  aspectRatio: number;
  dragState: SignatureDragState;
  markerState: SignatureMarkerState;
  getMarkerPdfPositionFromCanvas: MarkerPositionResolver;
};

export type DragSignatureMarkerResult =
  | { status: 'inactive' }
  | { status: 'missing-marker' }
  | { status: 'position-unavailable' }
  | { status: 'moved'; marker: SignatureMarker };

export function dragSignatureMarker({
  event,
  canvas,
  pdfPage,
  aspectRatio,
  dragState,
  markerState,
  getMarkerPdfPositionFromCanvas,
}: DragSignatureMarkerOptions): DragSignatureMarkerResult {
  if (dragState.activeIndex === null) return { status: 'inactive' };

  const marker = markerState.getMarker(dragState.activeIndex);
  if (!marker) return { status: 'missing-marker' };

  const rect = canvas.getBoundingClientRect();
  const position = getMarkerPdfPositionFromCanvas(
    marker,
    {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    },
    {
      width: canvas.width,
      height: canvas.height,
    },
    pdfPage,
    aspectRatio,
  );
  if (!position) return { status: 'position-unavailable' };

  Object.assign(marker, position);
  dragState.markMoved();
  return { status: 'moved', marker };
}

export function stopSignatureMarkerDrag(dragState: SignatureDragState) {
  if (dragState.activeIndex === null) return { status: 'inactive' as const };

  const result = dragState.stop();
  return {
    status: 'stopped' as const,
    movedDuringDrag: result.movedDuringDrag,
  };
}
