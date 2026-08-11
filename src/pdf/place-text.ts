import { StandardFonts, rgb, type PDFDocument } from 'pdf-lib';

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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

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

  const fontSize = clamp(Number(placement.fontSize) || 12, 6, 96);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);
  const x = clamp(placement.x, 0, Math.max(0, width - textWidth));
  const y = clamp(placement.y - textHeight, 0, Math.max(0, height - textHeight));

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0.11, 0.11, 0.12),
  });

  return pdf.save({ useObjectStreams: true });
}
