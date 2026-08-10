import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import { getElement, type StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

export type UnlockPdfFlowOptions = {
  file: File | null | undefined;
  password: string;
  buildUnlockedPdf(
    arrayBuffer: ArrayBuffer,
    password: string,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Uint8Array>;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  setActionBusy(buttonId: string, busyText: string): (() => void) | null;
  saveAs(blob: Blob, filename: string): void;
  logError?: (error: unknown) => void;
};

function reportUnlockStatus(
  message: string,
  type: StatusType,
  showStatus: UnlockPdfFlowOptions['showStatus'],
) {
  const inlineStatus = getElement('unlock-status');
  if (inlineStatus) {
    inlineStatus.textContent = message;
    inlineStatus.classList.remove('tool-status-processing', 'tool-status-success', 'tool-status-error');
    inlineStatus.classList.add(`tool-status-${type}`);
    inlineStatus.setAttribute('role', type === 'error' ? 'alert' : 'status');
    inlineStatus.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  }
  showStatus(message, type);
}

function isPasswordError(error: unknown) {
  const candidate = error as { code?: number; name?: string } | null;
  return candidate?.name === 'PasswordException' || candidate?.code === 1 || candidate?.code === 2;
}

export async function unlockPdfFlow(options: UnlockPdfFlowOptions) {
  const { file, i18n, showStatus } = options;
  if (!file) {
    reportUnlockStatus(i18n('Select a PDF file', 'Selecciona un archivo PDF'), 'error', showStatus);
    return { status: 'missing-file' as const };
  }

  const password = options.password.trim();
  if (!password) {
    reportUnlockStatus(i18n('Enter the PDF password', 'Escribe la contraseña del PDF'), 'error', showStatus);
    return { status: 'missing-password' as const };
  }

  const finish = options.setActionBusy(
    'unlock-action',
    i18n('Removing password...', 'Quitando clave...'),
  );
  if (!finish) return { status: 'busy' as const };

  try {
    reportUnlockStatus(
      i18n('Opening protected PDF...', 'Abriendo PDF protegido...'),
      'processing',
      showStatus,
    );
    const bytes = await options.buildUnlockedPdf(
      await file.arrayBuffer(),
      password,
      (completed, total) => reportUnlockStatus(i18n(
        'Creating unlocked copy: page {{completed}} of {{total}}...',
        'Creando copia sin clave: página {{completed}} de {{total}}...',
        { completed: String(completed), total: String(total) },
      ), 'processing', showStatus),
    );
    const filename = `${getPdfBaseName(file.name)}${i18n('-unlocked.pdf', '-sin-clave.pdf')}`;
    options.saveAs(pdfBytesToBlob(bytes), filename);
    reportUnlockStatus(
      i18n('Unlocked copy downloaded successfully', 'Copia sin clave descargada correctamente'),
      'success',
      showStatus,
    );
    return { status: 'success' as const, filename };
  } catch (error) {
    (options.logError ?? console.error)(error);
    if (isPasswordError(error)) {
      const message = i18n(
        'The password is incorrect. Check it and try again.',
        'La contraseña no es correcta. Revísala e intenta de nuevo.',
      );
      reportUnlockStatus(message, 'error', showStatus);
      return { status: 'incorrect-password' as const };
    }

    const detail = error instanceof Error ? error.message : String(error);
    const message = i18n(
      'The unlocked copy could not be created: {{message}}',
      'No se pudo crear la copia sin clave: {{message}}',
      { message: detail },
    );
    reportUnlockStatus(message, 'error', showStatus);
    return { status: 'error' as const, message: detail };
  } finally {
    finish();
  }
}
