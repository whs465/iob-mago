import { getElement, getRequiredElement } from './dom';
import { fileMatchesAccept } from './file-drag-drop';

export type SetupSignatureEventHandlersOptions = {
  loadPdf(file: File): Promise<void>;
  setSignatureImage(file: File): Promise<void>;
  setSignatureSource(file: File): Promise<void>;
  handlePointerMove(event: PointerEvent): void;
  handlePointerEnd(): void;
  onPdfRejected?(): void;
};

function clearFileInputOnClick(input: HTMLInputElement) {
  input.addEventListener('click', function() {
    this.value = '';
  });
}

function onFileChange(
  input: HTMLInputElement,
  handler: (file: File) => Promise<void>,
) {
  input.addEventListener('change', event => {
    const selectedFile = (event.target as HTMLInputElement).files?.[0];
    if (!selectedFile) return;
    if (!fileMatchesAccept(selectedFile, input.accept)) {
      input.dispatchEvent(new CustomEvent('filesrejected', {
        detail: { files: [selectedFile] },
      }));
      return;
    }
    void handler(selectedFile);
  });
}

export function setupSignatureEventHandlers({
  loadPdf,
  setSignatureImage,
  setSignatureSource,
  handlePointerMove,
  handlePointerEnd,
  onPdfRejected,
}: SetupSignatureEventHandlersOptions) {
  const pdfInput = getRequiredElement<HTMLInputElement>('sign-pdf-file');
  const sourceInput = getRequiredElement<HTMLInputElement>('signature-source-file');
  const cameraInput = getElement<HTMLInputElement>('signature-camera-file');

  clearFileInputOnClick(pdfInput);
  clearFileInputOnClick(sourceInput);
  if (cameraInput) clearFileInputOnClick(cameraInput);

  onFileChange(pdfInput, loadPdf);
  pdfInput.addEventListener('filesrejected', () => onPdfRejected?.());
  onFileChange(sourceInput, setSignatureSource);
  if (cameraInput) onFileChange(cameraInput, setSignatureSource);

  // Wire both signature image slots
  for (const slot of [1, 2] as const) {
    const imageInput = getRequiredElement<HTMLInputElement>(`sign-image-file-${slot}`);
    clearFileInputOnClick(imageInput);
    onFileChange(imageInput, setSignatureImage);
  }

  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerEnd);
  document.addEventListener('pointercancel', handlePointerEnd);
}
