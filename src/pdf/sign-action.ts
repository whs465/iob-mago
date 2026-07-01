import type { SignatureMarker } from '../state/signature-markers';
import { type SignPdfDeps, signPdfWithImage } from './sign';

export type ApplyPdfSignaturesInput = {
  file: File | null;
  imageBytes: ArrayBuffer | null;
  imageType?: string | null;
  markers: SignatureMarker[];
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

export async function applyPdfSignatures({
  file,
  imageBytes,
  imageType,
  markers,
  applyAllPages,
  deps,
}: ApplyPdfSignaturesInput): Promise<ApplyPdfSignaturesResult> {
  const validationStatus = validatePdfSignatureInputs({ file, imageBytes, markers });
  if (validationStatus) return { status: validationStatus };

  const pdfBytes = await signPdfWithImage(
    file,
    imageBytes,
    markers,
    {
      applyAllPages,
      imageType,
      deps,
    },
  );

  return {
    status: 'success',
    file,
    pdfBytes,
  };
}
