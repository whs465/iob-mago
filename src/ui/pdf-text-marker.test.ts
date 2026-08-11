// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { getPdfTextPointFromCanvas, renderPdfTextMarker } from './pdf-text-marker';

describe('PDF text marker UI', () => {
  it('converts a scaled canvas click to PDF coordinates', () => {
    expect(getPdfTextPointFromCanvas(
      { clientX: 150, clientY: 225 },
      { left: 50, top: 25, width: 200, height: 400 },
      { canvasWidth: 400, canvasHeight: 800, pageWidth: 600, pageHeight: 1200 },
    )).toEqual({ x: 300, y: 600 });
  });

  it('renders the marker only on its page and supports removal', () => {
    const container = document.createElement('div');
    const onRemove = vi.fn();
    const marker = { page: 1, x: 300, y: 600, text: 'Aprobado', fontSize: 12 };
    const metrics = { canvasWidth: 400, canvasHeight: 800, pageWidth: 600, pageHeight: 1200 };

    renderPdfTextMarker(container, marker, 1, metrics, onRemove);
    expect(container.querySelector('.pdf-text-marker')?.textContent).toContain('Aprobado');
    container.querySelector<HTMLButtonElement>('button')?.click();
    expect(onRemove).toHaveBeenCalledOnce();

    renderPdfTextMarker(container, marker, 2, metrics, onRemove);
    expect(container.querySelector('.pdf-text-marker')).toBeNull();
  });
});
