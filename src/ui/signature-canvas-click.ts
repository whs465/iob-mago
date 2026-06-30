import type { SignatureMarker } from '../state/signature-markers';
import type { SignatureViewerState } from '../state/signature-viewer';
import { getMarkerPdfPositionFromCanvas } from '../utils/signature-geometry';

export type CreateSignatureMarkerFromCanvasClickOptions = {
  event: MouseEvent;
  canvas: HTMLCanvasElement;
  viewerState: SignatureViewerState;
  size: number;
  aspectRatio: number;
};

export async function createSignatureMarkerFromCanvasClick({
  event,
  canvas,
  viewerState,
  size,
  aspectRatio,
}: CreateSignatureMarkerFromCanvasClickOptions): Promise<SignatureMarker | null> {
  const pdfDocProxy = viewerState.pdfDocProxy;
  if (!pdfDocProxy) return null;

  const rect = canvas.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  const pdfPage = await pdfDocProxy.getPage(viewerState.currentPage);
  const position = getMarkerPdfPositionFromCanvas(
    { size },
    point,
    {
      width: canvas.width,
      height: canvas.height,
    },
    {
      width: pdfPage.view[2],
      height: pdfPage.view[3],
    },
    aspectRatio,
  );
  if (!position) return null;

  return {
    page: viewerState.currentPage,
    size,
    ...position,
  };
}
