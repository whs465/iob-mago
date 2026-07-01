import { applySignedPdfDownloadAction, type ApplySignedPdfDownloadResult } from '../pdf/sign-download-action';
import { validatePdfSignatureInputs } from '../pdf/sign-action';
import type { SignatureMarker } from '../state/signature-markers';
import type { SignPdfDeps } from '../pdf/sign';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type ApplySignatureBusyHandler = (() => void) | null;

export type ApplySignatureFlowOptions = {
  file: File | null;
  imageBytes: ArrayBuffer | null;
  imageType?: string | null;
  markers: SignatureMarker[];
  applyAllPages: boolean;
  deps: SignPdfDeps;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): ApplySignatureBusyHandler;
  saveAs(blob: Blob, filename: string): void;
  applySignedPdfDownload?: typeof applySignedPdfDownloadAction;
  logError?: (error: unknown) => void;
};

export type ApplySignatureFlowResult =
  | { status: 'busy' }
  | { status: 'missing-pdf' | 'missing-image' | 'missing-markers' }
  | { status: 'success'; filename: string }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getValidationMessage(
  status: 'missing-pdf' | 'missing-image' | 'missing-markers',
  i18n: SignatureMetaTranslator,
) {
  if (status === 'missing-pdf') {
    return i18n('Select a PDF to sign', 'Selecciona un PDF para firmar');
  }
  if (status === 'missing-image') {
    return i18n('Upload a signature image', 'Sube una imagen de firma');
  }
  return i18n('Mark at least one signature position', 'Marca al menos una posición para la firma');
}

export async function applySignatureFlow({
  file,
  imageBytes,
  imageType,
  markers,
  applyAllPages,
  deps,
  i18n,
  showStatus,
  setActionBusy,
  saveAs,
  applySignedPdfDownload = applySignedPdfDownloadAction,
  logError = console.error,
}: ApplySignatureFlowOptions): Promise<ApplySignatureFlowResult> {
  const validationStatus = validatePdfSignatureInputs({ file, imageBytes, markers });
  if (validationStatus) {
    showStatus(getValidationMessage(validationStatus, i18n), 'error');
    return { status: validationStatus };
  }

  const finishProcessing = setActionBusy(
    'sign-action',
    i18n('Applying...', 'Aplicando...'),
  );
  if (!finishProcessing) return { status: 'busy' };

  showStatus(i18n('Applying signature(s)...', 'Aplicando firma(s)...'), 'processing');

  try {
    const result: ApplySignedPdfDownloadResult = await applySignedPdfDownload({
      file,
      imageBytes,
      imageType,
      markers,
      applyAllPages,
      deps,
      filenameSuffix: i18n('-signed.pdf', '-firmado.pdf'),
    });

    if (result.status !== 'success') return { status: result.status };

    saveAs(result.blob, result.filename);
    showStatus(
      i18n('Signature applied successfully!', 'Firma aplicada exitosamente!'),
      'success',
    );

    return { status: 'success', filename: result.filename };
  } catch (error) {
    logError(error);
    const message = getErrorMessage(error);
    showStatus(
      i18n('Error applying signature: {{message}}', 'Error al aplicar firma: {{message}}', { message }),
      'error',
    );
    return { status: 'error', message };
  } finally {
    finishProcessing();
  }
}
