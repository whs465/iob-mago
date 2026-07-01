import type { SignatureMarker } from '../state/signature-markers';
import { getSignaturePdfDimensions } from '../utils/signature-geometry';

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
};

export type SignablePdfDocument = {
  embedPng(imageBytes: ArrayBuffer): Promise<SignatureImage>;
  embedJpg(imageBytes: ArrayBuffer): Promise<SignatureImage>;
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
  imageBytes: ArrayBuffer,
  markers: SignatureMarker[],
  options: SignPdfOptions,
) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await options.deps.loadPdfDocument(arrayBuffer);
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

    page.drawImage(signatureImage, {
      x,
      y,
      width,
      height,
    });
  };

  if (options.applyAllPages && markers.length > 0) {
    const baseMarker = markers[0];
    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const page = pdfDoc.getPage(i);
      applySignature(page, { ...baseMarker, page: i + 1 });
    }
  } else {
    for (const marker of markers) {
      const page = pdfDoc.getPage(marker.page - 1);
      applySignature(page, marker);
    }
  }

  return pdfDoc.save();
}
