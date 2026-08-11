export type ScanPageFormat = 'a4' | 'letter' | 'original';

export type ScannedImagePage = {
  bytes: ArrayBuffer;
  type: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
};

export type ScanPdfOptions = {
  format: ScanPageFormat;
  margin: number;
};

type EmbeddedImage = { width: number; height: number };
type ScanPdfPage = {
  drawImage(image: EmbeddedImage, options: { x: number; y: number; width: number; height: number }): void;
};
type ScanPdfDocument = {
  embedPng(bytes: ArrayBuffer): Promise<EmbeddedImage>;
  embedJpg(bytes: ArrayBuffer): Promise<EmbeddedImage>;
  addPage(size: [number, number]): ScanPdfPage;
  save(options?: { useObjectStreams?: boolean }): Promise<Uint8Array>;
};

export type ScanPdfDeps = {
  createPdfDocument(): Promise<ScanPdfDocument>;
};

const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;
const PIXEL_TO_POINT = 72 / 96;
const MAX_ORIGINAL_EDGE = 1440;

export function getScanPageLayout(
  imageWidth: number,
  imageHeight: number,
  options: ScanPdfOptions,
) {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  let pageWidth: number;
  let pageHeight: number;

  if (options.format === 'original') {
    const naturalWidth = safeWidth * PIXEL_TO_POINT;
    const naturalHeight = safeHeight * PIXEL_TO_POINT;
    const scale = Math.min(1, MAX_ORIGINAL_EDGE / Math.max(naturalWidth, naturalHeight));
    pageWidth = naturalWidth * scale;
    pageHeight = naturalHeight * scale;
  } else {
    const [portraitWidth, portraitHeight] = PAGE_SIZES[options.format];
    const landscape = safeWidth > safeHeight;
    pageWidth = landscape ? portraitHeight : portraitWidth;
    pageHeight = landscape ? portraitWidth : portraitHeight;
  }

  const margin = Math.max(0, Math.min(options.margin, Math.min(pageWidth, pageHeight) / 3));
  const availableWidth = Math.max(1, pageWidth - margin * 2);
  const availableHeight = Math.max(1, pageHeight - margin * 2);
  const scale = Math.min(availableWidth / safeWidth, availableHeight / safeHeight);
  const width = safeWidth * scale;
  const height = safeHeight * scale;

  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

export async function scannedImagesToPdf(
  images: ScannedImagePage[],
  options: ScanPdfOptions,
  deps: ScanPdfDeps,
) {
  if (images.length === 0) throw new Error('At least one image is required');
  const pdf = await deps.createPdfDocument();

  for (const image of images) {
    const embedded = image.type === 'image/png'
      ? await pdf.embedPng(image.bytes)
      : await pdf.embedJpg(image.bytes);
    const layout = getScanPageLayout(image.width, image.height, options);
    const page = pdf.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(embedded, {
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    });
  }

  return pdf.save({ useObjectStreams: true });
}
