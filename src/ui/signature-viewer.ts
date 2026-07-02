import { getElement, getRequiredElement } from './dom';

export type PageInfoFormatter = (page: number, total: number) => string;
export type ZoomInfoFormatter = (zoomLevel: number) => string;

export function getPdfCanvas() {
  return getRequiredElement<HTMLCanvasElement>('pdf-canvas');
}

export function getPdfCanvasWrapper() {
  return getRequiredElement('canvas-wrapper');
}

export function syncSignatureMarkerLayerSize(width: number, height: number) {
  const markerLayer = getElement('signature-markers');
  if (!markerLayer) return;
  markerLayer.style.width = `${width}px`;
  markerLayer.style.height = `${height}px`;
}

export function showSignaturePdfViewer() {
  getRequiredElement('pdf-controls').style.display = 'flex';
  getRequiredElement('canvas-wrapper').style.display = 'block';
  getRequiredElement('help-text').style.display = 'block';
}

export function hideSignaturePdfViewer() {
  getRequiredElement('pdf-controls').style.display = 'none';
  getRequiredElement('canvas-wrapper').style.display = 'none';
  getRequiredElement('help-text').style.display = 'none';
}

export function clearPdfCanvas() {
  const canvas = getPdfCanvas();
  const context = canvas.getContext('2d');
  context?.clearRect(0, 0, canvas.width, canvas.height);
}

export function updateSignaturePageControls(
  page: number,
  total: number,
  formatPageInfo: PageInfoFormatter,
) {
  const pageInfo = getElement('page-info');
  const firstPage = getElement<HTMLButtonElement>('first-page');
  const prevPage = getElement<HTMLButtonElement>('prev-page');
  const nextPage = getElement<HTMLButtonElement>('next-page');
  const lastPage = getElement<HTMLButtonElement>('last-page');

  if (pageInfo) pageInfo.textContent = formatPageInfo(page, total);
  if (firstPage) firstPage.disabled = page <= 1;
  if (prevPage) prevPage.disabled = page <= 1;
  if (nextPage) nextPage.disabled = page >= total;
  if (lastPage) lastPage.disabled = page >= total;
}

export function updateSignatureZoomControls(
  zoomLevel: number,
  minZoomLevel: number,
  maxZoomLevel: number,
  formatZoomInfo: ZoomInfoFormatter,
) {
  const zoomInfo = getElement('zoom-info');
  const zoomOut = getElement<HTMLButtonElement>('zoom-out');
  const zoomIn = getElement<HTMLButtonElement>('zoom-in');

  if (zoomInfo) zoomInfo.textContent = formatZoomInfo(zoomLevel);
  if (zoomOut) zoomOut.disabled = zoomLevel <= minZoomLevel;
  if (zoomIn) zoomIn.disabled = zoomLevel >= maxZoomLevel;
}

export function resetSignaturePageControls(formatPageInfo: PageInfoFormatter) {
  updateSignaturePageControls(1, 1, formatPageInfo);
  const firstPage = getElement<HTMLButtonElement>('first-page');
  const prevPage = getElement<HTMLButtonElement>('prev-page');
  const nextPage = getElement<HTMLButtonElement>('next-page');
  const lastPage = getElement<HTMLButtonElement>('last-page');
  if (firstPage) firstPage.disabled = true;
  if (prevPage) prevPage.disabled = true;
  if (nextPage) nextPage.disabled = true;
  if (lastPage) lastPage.disabled = true;
}

export function resetSignatureZoomControls(formatZoomInfo: ZoomInfoFormatter) {
  updateSignatureZoomControls(1, 1, 2, formatZoomInfo);
}
