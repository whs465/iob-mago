import type { PreparedSignatureState } from '../state/prepared-signature';

export type SaveBlob = (blob: Blob, filename: string) => void;

export type PreparedSignatureFileFactory = new (
  bits: BlobPart[],
  fileName: string,
  options?: FilePropertyBag,
) => File;

export type PreparedSignatureActionResult =
  | { status: 'missing-prepared-signature' }
  | { status: 'ok'; fileName: string };

export type PreparedSignatureFileResult =
  | { status: 'missing-prepared-signature' }
  | { status: 'ok'; file: File };

export function getPreparedSignatureFileName(state: PreparedSignatureState) {
  return state.fileName || 'firma.png';
}

export function downloadPreparedSignatureBlob(
  state: PreparedSignatureState,
  saveAs: SaveBlob,
): PreparedSignatureActionResult {
  if (!state.blob) return { status: 'missing-prepared-signature' };

  const fileName = getPreparedSignatureFileName(state);
  saveAs(state.blob, fileName);
  return { status: 'ok', fileName };
}

export function createPreparedSignatureFile(
  state: PreparedSignatureState,
  FileCtor: PreparedSignatureFileFactory = File,
): PreparedSignatureFileResult {
  if (!state.blob) return { status: 'missing-prepared-signature' };

  const fileName = getPreparedSignatureFileName(state);
  return {
    status: 'ok',
    file: new FileCtor([state.blob], fileName, { type: 'image/png' }),
  };
}
