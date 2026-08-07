import { StandardFonts, degrees, rgb, type PDFDocument } from 'pdf-lib';

export type WatermarkOptions = {
  text: string;
  opacity: number;
  fontSize: number;
  angle: number;
  pageIndices: number[] | null;
};

export type WatermarkPdfDeps = {
  loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<PDFDocument>;
};

export async function addTextWatermark(file: File, options: WatermarkOptions, deps: WatermarkPdfDeps) {
  const text = options.text.trim();
  if (!text) throw new Error('Watermark text is required');

  const pdf = await deps.loadPdfDocument(await file.arrayBuffer());
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const selectedPages = options.pageIndices ? new Set(options.pageIndices) : null;
  const opacity = Math.min(1, Math.max(0.05, options.opacity));
  const fontSize = Math.min(200, Math.max(8, options.fontSize));

  pdf.getPages().forEach((page, index) => {
    if (selectedPages && !selectedPages.has(index)) return;
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    const radians = options.angle * Math.PI / 180;
    const rotatedWidth = Math.abs(textWidth * Math.cos(radians)) + Math.abs(textHeight * Math.sin(radians));
    const rotatedHeight = Math.abs(textWidth * Math.sin(radians)) + Math.abs(textHeight * Math.cos(radians));

    page.drawText(text, {
      x: (width - rotatedWidth) / 2,
      y: (height - rotatedHeight) / 2,
      size: fontSize,
      font,
      color: rgb(0.42, 0.45, 0.5),
      opacity,
      rotate: degrees(options.angle),
    });
  });

  return pdf.save({ useObjectStreams: true });
}
