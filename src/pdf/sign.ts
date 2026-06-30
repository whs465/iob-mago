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
  deps: SignPdfDeps;
};

export async function signPdfWithImage(
  file: File,
  imageBytes: ArrayBuffer,
  markers: SignatureMarker[],
  options: SignPdfOptions,
) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await options.deps.loadPdfDocument(arrayBuffer);

  let signatureImage;
  try {
    signatureImage = await pdfDoc.embedPng(imageBytes);
  } catch {
    signatureImage = await pdfDoc.embedJpg(imageBytes);
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
