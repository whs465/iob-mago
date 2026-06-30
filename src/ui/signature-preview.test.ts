// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  clearPreparedSignaturePreview,
  getPreparedSignatureMetaText,
  renderPreparedSignatureReady,
  renderPreparedSignatureRecolor,
  setPreparedSignatureActionsEnabled,
  setSignatureGeneratorControlsEnabled,
  showPreparedSignaturePreview,
  showSignaturePreview,
  updateSignImageLabel,
  updateSignatureCleanValue,
  updateSignatureGeneratorMeta,
  updateSignatureSizeValue,
  updateSignatureToneDisplay,
} from './signature-preview';

describe('signature preview UI helpers', () => {
  it('updates signature labels while preserving file inputs', () => {
    document.body.innerHTML = '<label id="sign-image-label"><input id="sign-image-file" type="file"></label>';

    updateSignImageLabel('Loaded', true);

    const label = document.getElementById('sign-image-label') as HTMLLabelElement;
    expect(label.textContent).toBe('Loaded');
    expect(label.classList.contains('has-files')).toBe(true);
    expect(label.querySelector('input')?.id).toBe('sign-image-file');
  });

  it('shows active and prepared signature previews', () => {
    document.body.innerHTML = `
      <img id="signature-preview">
      <img id="prepared-signature-preview">
      <div id="signature-preview-empty"></div>
    `;

    showSignaturePreview('blob:active', 'Signature preview');
    showPreparedSignaturePreview('blob:prepared');

    expect((document.getElementById('signature-preview') as HTMLImageElement).src).toBe('blob:active');
    expect(document.getElementById('signature-preview')?.classList.contains('visible')).toBe(true);
    expect((document.getElementById('prepared-signature-preview') as HTMLImageElement).src).toBe('blob:prepared');
    expect(document.getElementById('signature-preview-empty')?.style.display).toBe('none');

    clearPreparedSignaturePreview();

    expect(document.getElementById('prepared-signature-preview')?.hasAttribute('src')).toBe(false);
    expect(document.getElementById('signature-preview-empty')?.style.display).toBe('block');
  });

  it('updates prepared signature actions, meta, tone and clean value', () => {
    document.body.innerHTML = `
      <button id="signature-download-action"></button>
      <button id="signature-use-action"></button>
      <div id="signature-generator-meta"></div>
      <div id="signature-tone-name"></div>
      <div id="signature-color-dot"></div>
      <span id="signature-clean-value"></span>
      <span id="size-value"></span>
      <input id="signature-tone-range">
      <input id="signature-clean-sensitivity">
    `;

    setPreparedSignatureActionsEnabled(true);
    updateSignatureGeneratorMeta('Ready');
    updateSignatureToneDisplay('Graphite', '#111827');
    updateSignatureCleanValue('42');
    updateSignatureSizeValue(96);
    setSignatureGeneratorControlsEnabled(false);

    expect((document.getElementById('signature-download-action') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('signature-use-action') as HTMLButtonElement).disabled).toBe(false);
    expect(document.getElementById('signature-generator-meta')?.textContent).toBe('Ready');
    expect(document.getElementById('signature-tone-name')?.textContent).toBe('Graphite');
    expect(document.getElementById('signature-color-dot')?.style.background).toBe('rgb(17, 24, 39)');
    expect(document.getElementById('signature-clean-value')?.textContent).toBe('42');
    expect(document.getElementById('size-value')?.textContent).toBe('96px');
    expect((document.getElementById('signature-tone-range') as HTMLInputElement).disabled).toBe(true);
    expect((document.getElementById('signature-clean-sensitivity') as HTMLInputElement).disabled).toBe(true);
  });

  it('formats prepared signature metadata text', () => {
    const translate = (english: string, _spanish: string, values: Record<string, string> = {}) => (
      Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english)
    );

    expect(getPreparedSignatureMetaText({ width: 240, height: 80 }, 'Graphite', translate)).toBe(
      'PNG ready: 240 x 80 px · Graphite',
    );
  });

  it('renders a prepared signature result with actions and metadata', () => {
    document.body.innerHTML = `
      <img id="prepared-signature-preview">
      <div id="signature-preview-empty"></div>
      <button id="signature-download-action" disabled></button>
      <button id="signature-use-action" disabled></button>
      <div id="signature-generator-meta"></div>
    `;
    const translate = (english: string, _spanish: string, values: Record<string, string> = {}) => (
      Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english)
    );

    renderPreparedSignatureReady({ previewUrl: 'blob:ready', width: 320, height: 120 }, 'Ink', translate);

    expect((document.getElementById('prepared-signature-preview') as HTMLImageElement).src).toBe('blob:ready');
    expect(document.getElementById('signature-preview-empty')?.style.display).toBe('none');
    expect((document.getElementById('signature-download-action') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('signature-use-action') as HTMLButtonElement).disabled).toBe(false);
    expect(document.getElementById('signature-generator-meta')?.textContent).toBe('PNG ready: 320 x 120 px · Ink');
  });

  it('updates recolor metadata only after a prepared signature was rendered', () => {
    document.body.innerHTML = `
      <img id="prepared-signature-preview">
      <div id="signature-preview-empty"></div>
      <div id="signature-generator-meta"></div>
    `;
    const translate = (english: string, _spanish: string, values: Record<string, string> = {}) => (
      Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english)
    );

    renderPreparedSignatureRecolor({ previewUrl: 'blob:first', width: 200, height: 60 }, 'Blue', translate);

    expect((document.getElementById('prepared-signature-preview') as HTMLImageElement).src).toBe('blob:first');
    expect(document.getElementById('signature-generator-meta')?.textContent).toBe('');

    updateSignatureGeneratorMeta('PNG ready: old');
    renderPreparedSignatureRecolor({ previewUrl: 'blob:second', width: 200, height: 60 }, 'Blue', translate);

    expect((document.getElementById('prepared-signature-preview') as HTMLImageElement).src).toBe('blob:second');
    expect(document.getElementById('signature-generator-meta')?.textContent).toBe('PNG ready: 200 x 60 px · Blue');
  });
});
