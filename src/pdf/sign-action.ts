import type { SignatureMarker } from '../state/signature-markers';
import type { PdfTextPlacement } from './place-text';
import { type SignPdfDeps, signPdfWithImage } from './sign';

export type ApplyPdfSignaturesInput = {
  file: File | null;
  imageBytes: ArrayBuffer | null;
  imageType?: string | null;
  markers: SignatureMarker[];
  textPlacements?: PdfTextPlacement[];
  applyAllPages: boolean;
  deps: SignPdfDeps;
};

export type ApplyPdfSignaturesResult =
  | { status: 'missing-pdf' }
  | { status: 'missing-image' }
  | { status: 'missing-markers' }
  | { status: 'success'; file: File; pdfBytes: Uint8Array };

export type ApplyPdfSignaturesValidationStatus = Exclude<ApplyPdfSignaturesResult['status'], 'success'>;

export function validatePdfSignatureInputs({
  file,
  imageBytes,
  markers,
}: Pick<ApplyPdfSignaturesInput, 'file' | 'imageBytes' | 'markers'>): ApplyPdfSignaturesValidationStatus | null {
  if (!file) return 'missing-pdf';
  if (!imageBytes) return 'missing-image';
  if (markers.length === 0) return 'missing-markers';
  return null;
}

export function validatePdfEditInputs({
  file,
  imageBytes,
  markers,
  textPlacements = [],
}: Pick<ApplyPdfSignaturesInput, 'file' | 'imageBytes' | 'markers' | 'textPlacements'>): ApplyPdfSignaturesValidationStatus | null {
  if (!file) return 'missing-pdf';
  if (markers.length > 0 && !imageBytes) return 'missing-image';
  if (markers.length === 0 && textPlacements.length === 0) return 'missing-markers';
  return null;
}

export async function applyPdfSignatures({
  file,
  imageBytes,
  imageType,
  markers,
  textPlacements = [],
  applyAllPages,
  deps,
}: ApplyPdfSignaturesInput): Promise<ApplyPdfSignaturesResult> {
  const validationStatus = validatePdfEditInputs({ file, imageBytes, markers, textPlacements });
  if (validationStatus) return { status: validationStatus };

  const pdfBytes = await signPdfWithImage(
    file,
    imageBytes,
    markers,
    {
      applyAllPages,
      imageType,
      deps,
      textPlacements,
    },
  );

  return {
    status: 'success',
    file,
    pdfBytes,
  };
}
