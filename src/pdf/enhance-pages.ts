import { PDFDocument, PDFName } from 'pdf-lib';
import type { PDFPageProxy } from 'pdfjs-dist';

export type PageTone = { contrast: number; brightness: number };
export const NEUTRAL_PAGE_TONE: PageTone = { contrast: 100, brightness: 0 };

export function adjustPagePixels(source: Uint8ClampedArray, output: Uint8ClampedArray, tone: PageTone) {
  const contrast = tone.contrast / 100;
  const brightness = tone.brightness * 2.55;
  for (let offset = 0; offset < source.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = source[offset + channel];
      output[offset + channel] = 255 - (255 - value) * contrast + brightness;
    }
    output[offset + 3] = source[offset + 3];
  }
}

export function renderEnhancementPage(
  page: PDFPageProxy, canvas: HTMLCanvasElement, maxEdge: number, annotationMode: number, rotation = page.rotate,
) {
  const original = page.getViewport({ scale: 1, rotation });
  const viewport = page.getViewport({ scale: Math.min(4, maxEdge / Math.max(original.width, original.height)), rotation });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
  if (!canvasContext) throw new Error('Canvas unavailable');
  return page.render({
    canvasContext, viewport, annotationMode, background: '#ffffff',
    transform: [canvas.width / viewport.width, 0, 0, canvas.height / viewport.height, 0, 0],
  });
}

type EnhancedPageImage = { png: ArrayBuffer; view: readonly number[] };

export async function enhancePdfPages(
  bytes: ArrayBuffer,
  adjustments: ReadonlyMap<number, PageTone>,
  renderPage: (pageNumber: number, tone: PageTone) => Promise<EnhancedPageImage>,
) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  for (const [pageNumber, tone] of adjustments) {
    const page = pdf.getPage(pageNumber - 1);
    const { png, view: [left, bottom, right, top] } = await renderPage(pageNumber, tone);
    const image = await pdf.embedPng(png);
    // Keep the page reference so outlines, links and annotations continue to target this page.
    page.node.set(PDFName.of('Contents'), pdf.context.obj([]));
    page.drawImage(image, { x: left, y: bottom, width: right - left, height: top - bottom });
  }
  return pdf.save({ updateFieldAppearances: false });
}
