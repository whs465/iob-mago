import type { PdfTextMarker } from '../state/pdf-text-marker';

export type PdfTextMarkerMetrics = {
  canvasWidth: number;
  canvasHeight: number;
  pageWidth: number;
  pageHeight: number;
};

export function getPdfTextPointFromCanvas(
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  metrics: PdfTextMarkerMetrics,
) {
  if (!bounds.width || !bounds.height || !metrics.canvasWidth || !metrics.canvasHeight) return null;
  const canvasX = ((event.clientX - bounds.left) / bounds.width) * metrics.canvasWidth;
  const canvasY = ((event.clientY - bounds.top) / bounds.height) * metrics.canvasHeight;

  return {
    x: (canvasX / metrics.canvasWidth) * metrics.pageWidth,
    y: metrics.pageHeight - (canvasY / metrics.canvasHeight) * metrics.pageHeight,
  };
}

export function renderPdfTextMarker(
  container: HTMLElement,
  marker: PdfTextMarker | null,
  currentPage: number,
  metrics: PdfTextMarkerMetrics,
  onRemove: (event: Event) => void,
) {
  container.querySelector('.pdf-text-marker')?.remove();
  if (!marker || marker.page !== currentPage || !marker.text.trim()) return;

  const element = document.createElement('div');
  element.className = 'pdf-text-marker';
  element.style.left = `${(marker.x / metrics.pageWidth) * metrics.canvasWidth}px`;
  element.style.top = `${((metrics.pageHeight - marker.y) / metrics.pageHeight) * metrics.canvasHeight}px`;
  element.style.fontSize = `${(marker.fontSize / metrics.pageHeight) * metrics.canvasHeight}px`;
  element.textContent = marker.text.trim();

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'signature-marker-delete pdf-text-marker-delete';
  remove.setAttribute('aria-label', 'Quitar texto');
  remove.textContent = '✕';
  remove.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onRemove(event);
  });
  element.appendChild(remove);
  container.appendChild(element);
}
