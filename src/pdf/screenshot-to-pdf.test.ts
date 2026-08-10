import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { screenshotPngToPdf } from './screenshot-to-pdf';

describe('screenshotPngToPdf', () => {
  it('creates a single-page PDF with the same image proportions', async () => {
    const png = Uint8Array.from(atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEElEQVR42mP8z8AARAwMjAAAAP//AwAF/gL+4xL6WQAAAABJRU5ErkJggg==',
    ), character => character.charCodeAt(0));
    const sourcePdf = await PDFDocument.create();
    const sourceImage = await sourcePdf.embedPng(png);
    const bytes = await screenshotPngToPdf(new Blob([png], { type: 'image/png' }));
    const result = await PDFDocument.load(bytes);
    const page = result.getPage(0);

    expect(result.getPageCount()).toBe(1);
    expect(page.getWidth() / page.getHeight()).toBeCloseTo(sourceImage.width / sourceImage.height, 3);
  });
});
