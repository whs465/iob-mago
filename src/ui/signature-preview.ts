import { getElement } from './dom';
import { updateFileInputLabel } from './dom';

export function updateSignPdfLabel(text: string, hasFile = false) {
  updateFileInputLabel('sign-pdf-label', 'sign-pdf-file', text, hasFile);
}

export function updateSignImageLabel(text: string, hasFile = false) {
  updateFileInputLabel('sign-image-label', 'sign-image-file', text, hasFile);
}

export function updateSignatureSourceLabel(text: string, hasFile = false) {
  updateFileInputLabel('signature-source-label', 'signature-source-file', text, hasFile);
}

export function showSignaturePreview(src: string, alt: string) {
  const preview = getElement<HTMLImageElement>('signature-preview');
  if (!preview) return;

  preview.src = src;
  preview.alt = alt;
  preview.classList.add('visible');
}

export function showPreparedSignaturePreview(src: string) {
  const preview = getElement<HTMLImageElement>('prepared-signature-preview');
  const empty = getElement('signature-preview-empty');

  if (preview) {
    preview.src = src;
    preview.classList.add('visible');
  }
  if (empty) empty.style.display = 'none';
}

export function clearPreparedSignaturePreview() {
  const preview = getElement<HTMLImageElement>('prepared-signature-preview');
  const empty = getElement('signature-preview-empty');

  if (preview) {
    preview.removeAttribute('src');
    preview.classList.remove('visible');
  }
  if (empty) empty.style.display = 'block';
}

export function setPreparedSignatureActionsEnabled(enabled: boolean) {
  const download = getElement<HTMLButtonElement>('signature-download-action');
  const use = getElement<HTMLButtonElement>('signature-use-action');
  if (download) download.disabled = !enabled;
  if (use) use.disabled = !enabled;
}

export function updateSignatureGeneratorMeta(text: string) {
  const meta = getElement('signature-generator-meta');
  if (meta) meta.textContent = text;
}

export type SignatureMetaTranslator = (
  english: string,
  spanish: string,
  values?: Record<string, string>,
) => string;

export function getPreparedSignatureMetaText(
  dimensions: { width: number; height: number },
  toneLabel: string,
  i18n: SignatureMetaTranslator,
) {
  return i18n(
    'PNG ready: {{width}} x {{height}} px · {{tone}}',
    'PNG listo: {{width}} x {{height}} px · {{tone}}',
    {
      width: String(dimensions.width),
      height: String(dimensions.height),
      tone: toneLabel,
    },
  );
}

export function getSignatureGeneratorMetaText() {
  return getElement('signature-generator-meta')?.textContent ?? '';
}

export type PreparedSignaturePreviewResult = {
  previewUrl: string;
  width: number;
  height: number;
};

export function renderPreparedSignatureReady(
  result: PreparedSignaturePreviewResult,
  toneLabel: string,
  i18n: SignatureMetaTranslator,
) {
  showPreparedSignaturePreview(result.previewUrl);
  setPreparedSignatureActionsEnabled(true);
  updateSignatureGeneratorMeta(getPreparedSignatureMetaText(result, toneLabel, i18n));
}

export function renderPreparedSignatureRecolor(
  result: PreparedSignaturePreviewResult,
  toneLabel: string,
  i18n: SignatureMetaTranslator,
) {
  showPreparedSignaturePreview(result.previewUrl);

  if (getSignatureGeneratorMetaText()) {
    updateSignatureGeneratorMeta(getPreparedSignatureMetaText(result, toneLabel, i18n));
  }
}

export function updateSignatureToneDisplay(label: string, color: string) {
  const toneName = getElement('signature-tone-name');
  const toneDot = getElement('signature-color-dot');
  if (toneName) toneName.textContent = label;
  if (toneDot) toneDot.style.background = color;
}

export function updateSignatureCleanValue(value: string) {
  const cleanValue = getElement('signature-clean-value');
  if (cleanValue) cleanValue.textContent = value;
}

export function updateSignatureSizeValue(value: string | number) {
  const sizeValue = getElement('size-value');
  if (sizeValue) sizeValue.textContent = `${value}px`;
}

export function setSignatureGeneratorControlsEnabled(enabled: boolean) {
  ['signature-tone-range', 'signature-clean-sensitivity'].forEach(id => {
    const control = getElement<HTMLInputElement>(id);
    if (control) control.disabled = !enabled;
  });
}
