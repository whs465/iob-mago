import type { ActiveSignatureState } from '../state/active-signature';
import type { StoredSignatureImage } from '../state/signature-storage';

export type ActiveSignatureUrlRuntime = {
  createObjectURL(blob: Blob): string;
};

export type RestoreActiveSignatureDeps = {
  loadStoredSignatureImage(): StoredSignatureImage | null;
};

export type SetActiveSignatureDeps = {
  saveSignatureImageFile(file: File): Promise<void>;
  urls: ActiveSignatureUrlRuntime;
};

export type ActiveSignaturePreviewResult =
  | { status: 'missing-signature' }
  | {
    status: 'ok';
    previewSrc: string;
    label: string;
    isObjectUrl: boolean;
  };

export function restoreActiveSignatureFromStorage(
  state: ActiveSignatureState,
  deps: RestoreActiveSignatureDeps,
): ActiveSignaturePreviewResult {
  const storedSignature = deps.loadStoredSignatureImage();
  if (!storedSignature) return { status: 'missing-signature' };

  state.setImageBytes(storedSignature.bytes);
  return {
    status: 'ok',
    previewSrc: storedSignature.dataUrl,
    label: storedSignature.name,
    isObjectUrl: false,
  };
}

export async function setActiveSignatureFromFile(
  state: ActiveSignatureState,
  file: File,
  deps: SetActiveSignatureDeps,
): Promise<ActiveSignaturePreviewResult> {
  state.setImageBytes(await file.arrayBuffer());
  const previewSrc = deps.urls.createObjectURL(file);

  void deps.saveSignatureImageFile(file).catch(() => undefined);

  return {
    status: 'ok',
    previewSrc,
    label: file.name,
    isObjectUrl: true,
  };
}
