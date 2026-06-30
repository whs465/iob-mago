import {
  restoreActiveSignatureFromStorage,
  setActiveSignatureFromFile,
  type ActiveSignaturePreviewResult,
} from '../pdf/active-signature-action';
import type { ActiveSignatureState } from '../state/active-signature';
import type { ObjectUrlRuntime } from '../state/prepared-signature';
import type { SignaturePreviewState } from '../state/signature-preview';
import type { StoredSignatureImage } from '../state/signature-storage';
import type { SignatureMetaTranslator } from './signature-preview';
import { showSignaturePreview, updateSignImageLabel } from './signature-preview';

export type ActiveSignatureFlowOptions = {
  activeState: ActiveSignatureState;
  previewState: SignaturePreviewState;
  urls: Pick<ObjectUrlRuntime, 'createObjectURL' | 'revokeObjectURL'>;
  i18n: SignatureMetaTranslator;
  loadSignatureAspectRatio(src: string): Promise<number>;
  updateMarkersDisplay(): void;
};

export async function applyActiveSignaturePreviewResult(
  result: ActiveSignaturePreviewResult,
  {
    activeState,
    previewState,
    urls,
    i18n,
    loadSignatureAspectRatio,
    updateMarkersDisplay,
  }: ActiveSignatureFlowOptions,
) {
  if (result.status === 'missing-signature') return result;

  // Guardar siempre el previewSrc para que los marcadores puedan mostrarlo
  if (result.isObjectUrl) {
    previewState.setObjectUrl(result.previewSrc, urls);
  } else {
    // data URL: almacenar directamente (no necesita revoke)
    previewState.setObjectUrl(result.previewSrc, { revokeObjectURL: () => {} });
  }

  showSignaturePreview(result.previewSrc, i18n('Signature preview', 'Vista previa de firma'));
  updateSignImageLabel(result.label || i18n('Signature loaded', 'Firma cargada'), true);

  try {
    activeState.setAspectRatio(await loadSignatureAspectRatio(result.previewSrc));
  } catch {
    activeState.resetAspectRatio();
  }
  updateMarkersDisplay();

  return result;
}

export type RestoreStoredActiveSignatureOptions = ActiveSignatureFlowOptions & {
  loadStoredSignatureImage(): StoredSignatureImage | null;
};

export function restoreStoredActiveSignature({
  activeState,
  loadStoredSignatureImage,
  ...flowOptions
}: RestoreStoredActiveSignatureOptions) {
  const result = restoreActiveSignatureFromStorage(activeState, { loadStoredSignatureImage });
  return applyActiveSignaturePreviewResult(result, {
    ...flowOptions,
    activeState,
  });
}

export type SetActiveSignatureImageFileOptions = ActiveSignatureFlowOptions & {
  saveSignatureImageFile(file: File): Promise<void>;
};

export async function setActiveSignatureImageFileFlow(
  file: File,
  {
    activeState,
    saveSignatureImageFile,
    urls,
    ...flowOptions
  }: SetActiveSignatureImageFileOptions,
) {
  const result = await setActiveSignatureFromFile(activeState, file, {
    saveSignatureImageFile,
    urls,
  });

  return applyActiveSignaturePreviewResult(result, {
    ...flowOptions,
    activeState,
    urls,
  });
}
