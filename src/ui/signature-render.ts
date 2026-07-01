import type { SignatureViewerState } from '../state/signature-viewer';
import {
  type PageInfoFormatter,
  syncSignatureMarkerLayerSize,
  updateSignaturePageControls,
  updateSignatureZoomControls,
} from './signature-viewer';

export type RenderSignaturePdfPageOptions = {
  viewerState: SignatureViewerState;
  pageNumber: number;
  canvas: HTMLCanvasElement;
  canvasWrapper: HTMLElement;
  formatPageInfo: PageInfoFormatter;
  onRendered?: () => void;
};

export function getSignatureRenderWidth(containerWidth: number, viewportWidth = containerWidth) {
  const viewportPadding = viewportWidth <= 520 ? 24 : viewportWidth <= 900 ? 48 : 96;
  const responsiveCap = Math.max(320, viewportWidth - viewportPadding);

  return Math.min(containerWidth, responsiveCap);
}

export async function renderSignaturePdfPage({
  viewerState,
  pageNumber,
  canvas,
  canvasWrapper,
  formatPageInfo,
  onRendered,
}: RenderSignaturePdfPageOptions) {
  const pdfDocProxy = viewerState.pdfDocProxy;
  if (!pdfDocProxy) return false;

  const page = await pdfDocProxy.getPage(pageNumber);
  const pageWidth = page.view[2];
  const pageHeight = page.view[3];
  const containerWidth = canvasWrapper.clientWidth
    || canvasWrapper.parentElement?.clientWidth
    || 800;
  const viewportWidth = typeof window !== 'undefined' && window.innerWidth > 0
    ? window.innerWidth
    : containerWidth;
  const fitWidth = getSignatureRenderWidth(containerWidth, viewportWidth);
  const currentScale = (fitWidth / pageWidth) * viewerState.zoomLevel;
  viewerState.setRenderedPageMetrics(pageWidth, pageHeight, currentScale);

  const viewport = page.getViewport({ scale: currentScale });
  const context = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;
  syncSignatureMarkerLayerSize(canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  updateSignaturePageControls(pageNumber, viewerState.totalPages, formatPageInfo);
  updateSignatureZoomControls(
    viewerState.zoomLevel,
    viewerState.minZoomLevel,
    viewerState.maxZoomLevel,
    zoomLevel => `${Math.round(zoomLevel * 100)}%`,
  );
  onRendered?.();
  return true;
}
