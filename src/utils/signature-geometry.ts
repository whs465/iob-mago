import type { SignatureMarker } from '../state/signature-markers';
import { clamp } from './math';

export type CanvasMetrics = {
  width: number;
  height: number;
};

export type PdfPageMetrics = {
  width: number;
  height: number;
};

export type Dimensions = {
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export function getSignaturePdfDimensions(marker: Pick<SignatureMarker, 'size'>, aspectRatio = 1): Dimensions {
  const width = marker.size;
  const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  return {
    width,
    height: width / safeAspectRatio,
  };
}

export function getSignatureCanvasDimensions(
  marker: Pick<SignatureMarker, 'size'>,
  canvas: CanvasMetrics,
  pdfPage: PdfPageMetrics,
  aspectRatio = 1,
): Dimensions {
  const pdfDimensions = getSignaturePdfDimensions(marker, aspectRatio);

  if (!canvas.width || !canvas.height || !pdfPage.width || !pdfPage.height) {
    return pdfDimensions;
  }

  return {
    width: (pdfDimensions.width / pdfPage.width) * canvas.width,
    height: (pdfDimensions.height / pdfPage.height) * canvas.height,
  };
}

export function getMarkerPdfPositionFromCanvas(
  marker: Pick<SignatureMarker, 'size'>,
  point: Point,
  canvas: CanvasMetrics,
  pdfPage: PdfPageMetrics,
  aspectRatio = 1,
): Pick<SignatureMarker, 'x' | 'y' | 'canvasX' | 'canvasY'> | null {
  if (!canvas.width || !canvas.height || !pdfPage.width || !pdfPage.height) return null;

  const markerDimensions = getSignatureCanvasDimensions(marker, canvas, pdfPage, aspectRatio);
  const halfWidth = markerDimensions.width / 2;
  const halfHeight = markerDimensions.height / 2;
  const canvasX = clamp(point.x, halfWidth, Math.max(halfWidth, canvas.width - halfWidth));
  const canvasY = clamp(point.y, halfHeight, Math.max(halfHeight, canvas.height - halfHeight));

  return {
    canvasX,
    canvasY,
    x: (canvasX / canvas.width) * pdfPage.width,
    y: pdfPage.height - (canvasY / canvas.height) * pdfPage.height,
  };
}

export function getMarkerCanvasPosition(
  marker: Pick<SignatureMarker, 'x' | 'y' | 'canvasX' | 'canvasY'>,
  canvas: CanvasMetrics,
  pdfPage: PdfPageMetrics,
): Point {
  if (!canvas.width || !canvas.height || !pdfPage.width || !pdfPage.height) {
    return {
      x: marker.canvasX || 0,
      y: marker.canvasY || 0,
    };
  }

  return {
    x: (marker.x / pdfPage.width) * canvas.width,
    y: ((pdfPage.height - marker.y) / pdfPage.height) * canvas.height,
  };
}
