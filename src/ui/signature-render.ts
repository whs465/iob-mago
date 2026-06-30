import type { SignatureViewerState } from '../state/signature-viewer';
import { type PageInfoFormatter, updateSignaturePageControls } from './signature-viewer';

export type RenderSignaturePdfPageOptions = {
  viewerState: SignatureViewerState;
  pageNumber: number;
  canvas: HTMLCanvasElement;
  canvasWrapper: HTMLElement;
  formatPageInfo: PageInfoFormatter;
  onRendered?: () => void;
};

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
  const desiredWidth = Math.min(containerWidth, 800);
  const currentScale = desiredWidth / pageWidth;
  viewerState.setRenderedPageMetrics(pageWidth, pageHeight, currentScale);

  const viewport = page.getViewport({ scale: currentScale });
  const context = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  updateSignaturePageControls(pageNumber, viewerState.totalPages, formatPageInfo);
  onRendered?.();
  return true;
}
