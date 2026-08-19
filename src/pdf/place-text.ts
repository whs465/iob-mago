import { StandardFonts, rgb, type PDFDocument } from 'pdf-lib';
import { getPdfTextDrawPosition } from '../utils/pdf-text-position';

export type PdfTextPlacement = {
  text: string;
  pageIndex: number;
  x: number;
  y: number;
  fontSize: number;
};

export type PlaceTextDeps = {
  loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<PDFDocument>;
};

export async function placeTextOnPdf(
  file: File,
  placement: PdfTextPlacement,
  deps: PlaceTextDeps,
) {
  const text = placement.text.trim();
  if (!text) throw new Error('Text is required');

  const pdf = await deps.loadPdfDocument(await file.arrayBuffer());
  const pages = pdf.getPages();
  const page = pages[placement.pageIndex];
  if (!page) throw new Error('Selected page does not exist');

  const fontSize = Math.min(96, Math.max(6, Number(placement.fontSize) || 12));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const textHeight = font.heightAtSize(fontSize);
  const { x, y } = getPdfTextDrawPosition(placement, { width, height }, textHeight);

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0.11, 0.11, 0.12),
  });

  return pdf.save({ useObjectStreams: true });
}
