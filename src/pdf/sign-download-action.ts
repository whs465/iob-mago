import type { SignatureMarker } from '../state/signature-markers';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import {
  applyPdfSignatures,
  type ApplyPdfSignaturesInput,
  type ApplyPdfSignaturesResult,
} from './sign-action';
import type { SignPdfDeps } from './sign';

export type ApplySignedPdfDownloadInput = {
  file: File | null;
  imageBytes: ArrayBuffer | null;
  markers: SignatureMarker[];
  applyAllPages: boolean;
  deps: SignPdfDeps;
  filenameSuffix: string;
  applySignatures?: (input: ApplyPdfSignaturesInput) => Promise<ApplyPdfSignaturesResult>;
};

export type ApplySignedPdfDownloadResult =
  | Exclude<ApplyPdfSignaturesResult, { status: 'success' }>
  | {
    status: 'success';
    blob: Blob;
    filename: string;
  };

export async function applySignedPdfDownloadAction({
  file,
  imageBytes,
  markers,
  applyAllPages,
  deps,
  filenameSuffix,
  applySignatures = applyPdfSignatures,
}: ApplySignedPdfDownloadInput): Promise<ApplySignedPdfDownloadResult> {
  const result = await applySignatures({
    file,
    imageBytes,
    markers,
    applyAllPages,
    deps,
  });

  if (result.status !== 'success') return result;

  return {
    status: 'success',
    blob: pdfBytesToBlob(result.pdfBytes),
    filename: getPdfBaseName(result.file.name) + filenameSuffix,
  };
}
