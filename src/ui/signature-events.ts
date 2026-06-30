import { getRequiredElement } from './dom';

export type SetupSignatureEventHandlersOptions = {
  loadPdf(file: File): Promise<void>;
  setSignatureImage(file: File): Promise<void>;
  setSignatureSource(file: File): Promise<void>;
  handlePointerMove(event: PointerEvent): void;
  handlePointerEnd(): void;
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
    if (selectedFile) void handler(selectedFile);
  });
}

export function setupSignatureEventHandlers({
  loadPdf,
  setSignatureImage,
  setSignatureSource,
  handlePointerMove,
  handlePointerEnd,
}: SetupSignatureEventHandlersOptions) {
  const pdfInput = getRequiredElement<HTMLInputElement>('sign-pdf-file');
  const imageInput = getRequiredElement<HTMLInputElement>('sign-image-file');
  const sourceInput = getRequiredElement<HTMLInputElement>('signature-source-file');

  clearFileInputOnClick(pdfInput);
  clearFileInputOnClick(imageInput);
  clearFileInputOnClick(sourceInput);

  onFileChange(pdfInput, loadPdf);
  onFileChange(imageInput, setSignatureImage);
  onFileChange(sourceInput, setSignatureSource);

  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerEnd);
  document.addEventListener('pointercancel', handlePointerEnd);
}
