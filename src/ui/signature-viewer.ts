import { getElement, getRequiredElement } from './dom';

export type PageInfoFormatter = (page: number, total: number) => string;

export function getPdfCanvas() {
  return getRequiredElement<HTMLCanvasElement>('pdf-canvas');
}

export function getPdfCanvasWrapper() {
  return getRequiredElement('canvas-wrapper');
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
  const prevPage = getElement<HTMLButtonElement>('prev-page');
  const nextPage = getElement<HTMLButtonElement>('next-page');

  if (pageInfo) pageInfo.textContent = formatPageInfo(page, total);
  if (prevPage) prevPage.disabled = page <= 1;
  if (nextPage) nextPage.disabled = page >= total;
}

export function resetSignaturePageControls(formatPageInfo: PageInfoFormatter) {
  updateSignaturePageControls(1, 1, formatPageInfo);
  const prevPage = getElement<HTMLButtonElement>('prev-page');
  const nextPage = getElement<HTMLButtonElement>('next-page');
  if (prevPage) prevPage.disabled = true;
  if (nextPage) nextPage.disabled = true;
}
