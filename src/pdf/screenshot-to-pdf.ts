import { PDFDocument } from 'pdf-lib';

const MAX_PAGE_EDGE_POINTS = 1440;
const PIXEL_TO_POINT = 72 / 96;

export async function screenshotPngToPdf(pngBlob: Blob) {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(await pngBlob.arrayBuffer());
  const naturalWidth = image.width * PIXEL_TO_POINT;
  const naturalHeight = image.height * PIXEL_TO_POINT;
  const scale = Math.min(1, MAX_PAGE_EDGE_POINTS / Math.max(naturalWidth, naturalHeight));
  let width = naturalWidth * scale;
  let height = naturalHeight * scale;
  const minimumScale = 1 / Math.min(width, height);
  if (minimumScale > 1) {
    width *= minimumScale;
    height *= minimumScale;
  }
  const page = pdf.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return pdf.save({ useObjectStreams: true });
}
