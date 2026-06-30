import type { SignatureViewerState } from '../state/signature-viewer';
import { renderSignaturePdfPage } from './signature-render';
import type { PageInfoFormatter } from './signature-viewer';

export type RenderSignatureViewerPageOptions = {
  viewerState: SignatureViewerState;
  pageNumber: number;
  canvas: HTMLCanvasElement;
  canvasWrapper: HTMLElement;
  formatPageInfo: PageInfoFormatter;
  updateMarkersDisplay(): void;
  renderPage?: typeof renderSignaturePdfPage;
};

export async function renderSignatureViewerPage({
  viewerState,
  pageNumber,
  canvas,
  canvasWrapper,
  formatPageInfo,
  updateMarkersDisplay,
  renderPage = renderSignaturePdfPage,
}: RenderSignatureViewerPageOptions) {
  return renderPage({
    viewerState,
    pageNumber,
    canvas,
    canvasWrapper,
    formatPageInfo,
    onRendered: updateMarkersDisplay,
  });
}

export type ChangeSignatureViewerPageOptions = {
  viewerState: SignatureViewerState;
  delta: number;
  onPageChange(pageNumber: number): Promise<void> | void;
};

export function changeSignatureViewerPage({
  viewerState,
  delta,
  onPageChange,
}: ChangeSignatureViewerPageOptions) {
  const newPage = viewerState.movePage(delta);
  if (newPage === null) return false;

  void onPageChange(newPage);
  return true;
}
