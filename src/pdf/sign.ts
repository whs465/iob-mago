import type { SignatureMarker } from '../state/signature-markers';
import type { PdfTextPlacement } from './place-text';
import { StandardFonts, rgb } from 'pdf-lib';
import { getSignaturePdfDimensions } from '../utils/signature-geometry';
import { getPdfTextDrawPosition } from '../utils/pdf-text-position';

type SignatureImage = {
  width: number;
  height: number;
};

type PdfPageWithDrawImage = {
  drawImage(
    image: SignatureImage,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ): void;
  drawText?(text: string, options: Record<string, unknown>): void;
  getSize?(): { width: number; height: number };
};

export type SignablePdfDocument = {
  embedPng(imageBytes: ArrayBuffer): Promise<SignatureImage>;
  embedJpg(imageBytes: ArrayBuffer): Promise<SignatureImage>;
  embedFont?(font: typeof StandardFonts.Helvetica): Promise<{
    widthOfTextAtSize(text: string, size: number): number;
    heightAtSize(size: number): number;
  }>;
  getPageCount(): number;
  getPage(index: number): PdfPageWithDrawImage;
  save(): Promise<Uint8Array>;
};

export type SignPdfDeps = {
  loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<SignablePdfDocument>;
};

export type SignPdfOptions = {
  applyAllPages: boolean;
  imageType?: string | null;
  deps: SignPdfDeps;
  textPlacements?: PdfTextPlacement[];
};

function detectImageTypeFromBytes(imageBytes: ArrayBuffer) {
  const bytes = new Uint8Array(imageBytes);
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  return null;
}

export async function signPdfWithImage(
  file: File,
  imageBytes: ArrayBuffer | null,
  markers: SignatureMarker[],
  options: SignPdfOptions,
) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await options.deps.loadPdfDocument(arrayBuffer);
  if (markers.length > 0) {
    if (!imageBytes) throw new Error('A signature image is required.');
    const detectedImageType = detectImageTypeFromBytes(imageBytes);
    const normalizedImageType = options.imageType?.toLowerCase() || detectedImageType;

    let signatureImage;
    if (normalizedImageType === 'image/jpeg' || normalizedImageType === 'image/jpg') {
      signatureImage = await pdfDoc.embedJpg(imageBytes);
    } else if (normalizedImageType === 'image/png') {
      signatureImage = await pdfDoc.embedPng(imageBytes);
    } else {
      try {
        signatureImage = await pdfDoc.embedPng(imageBytes);
      } catch {
        try {
          signatureImage = await pdfDoc.embedJpg(imageBytes);
        } catch {
          throw new Error('Unsupported signature image format. Use PNG or JPG.');
        }
      }
    }

    const applySignature = (page: PdfPageWithDrawImage, marker: SignatureMarker) => {
      const imageAspectRatio = signatureImage.width / signatureImage.height;
      const { width, height } = getSignaturePdfDimensions(marker, imageAspectRatio);
      const x = marker.x - width / 2;
      const y = marker.y - height / 2;

      page.drawImage(signatureImage, { x, y, width, height });
    };

    if (options.applyAllPages) {
      const baseMarker = markers[0];
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        applySignature(pdfDoc.getPage(i), { ...baseMarker, page: i + 1 });
      }
    } else {
      for (const marker of markers) applySignature(pdfDoc.getPage(marker.page - 1), marker);
    }
  }

  const textPlacements = options.textPlacements ?? [];
  if (textPlacements.length > 0) {
    if (!pdfDoc.embedFont) throw new Error('This PDF runtime cannot embed text.');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    for (const placement of textPlacements) {
      const text = placement.text.trim();
      const page = pdfDoc.getPage(placement.pageIndex);
      if (!text || !page?.drawText || !page.getSize) continue;
      const size = Math.min(96, Math.max(6, Number(placement.fontSize) || 12));
      const { width, height } = page.getSize();
      const textHeight = font.heightAtSize(size);
      const { x, y } = getPdfTextDrawPosition(placement, { width, height }, textHeight);
      page.drawText(text, { x, y, size, font, color: rgb(0.11, 0.11, 0.12) });
    }
  }

  return pdfDoc.save();
}
