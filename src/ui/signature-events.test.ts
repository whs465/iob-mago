// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupSignatureEventHandlers } from './signature-events';

function renderSignatureInputs() {
  document.body.innerHTML = `
    <input id="sign-pdf-file" type="file" />
    <input id="sign-image-file" type="file" />
    <input id="signature-source-file" type="file" />
  `;
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });
}

describe('setupSignatureEventHandlers', () => {
  beforeEach(() => {
    renderSignatureInputs();
  });

  it('clears file inputs on click', () => {
    setupSignatureEventHandlers({
      loadPdf: vi.fn(),
      setSignatureImage: vi.fn(),
      setSignatureSource: vi.fn(),
      handlePointerMove: vi.fn(),
      handlePointerEnd: vi.fn(),
    });
    const input = document.getElementById('sign-pdf-file') as HTMLInputElement;
    const valueSetter = vi.fn();
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => 'C:\\fakepath\\document.pdf',
      set: valueSetter,
    });

    input.click();

    expect(valueSetter).toHaveBeenCalledWith('');
  });

  it('delegates selected files to the matching handlers', () => {
    const loadPdf = vi.fn(async () => undefined);
    const setSignatureImage = vi.fn(async () => undefined);
    const setSignatureSource = vi.fn(async () => undefined);
    setupSignatureEventHandlers({
      loadPdf,
      setSignatureImage,
      setSignatureSource,
      handlePointerMove: vi.fn(),
      handlePointerEnd: vi.fn(),
    });

    const pdf = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    const image = new File(['png'], 'signature.png', { type: 'image/png' });
    const source = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });
    const pdfInput = document.getElementById('sign-pdf-file') as HTMLInputElement;
    const imageInput = document.getElementById('sign-image-file') as HTMLInputElement;
    const sourceInput = document.getElementById('signature-source-file') as HTMLInputElement;

    setInputFiles(pdfInput, [pdf]);
    setInputFiles(imageInput, [image]);
    setInputFiles(sourceInput, [source]);
    pdfInput.dispatchEvent(new Event('change'));
    imageInput.dispatchEvent(new Event('change'));
    sourceInput.dispatchEvent(new Event('change'));

    expect(loadPdf).toHaveBeenCalledWith(pdf);
    expect(setSignatureImage).toHaveBeenCalledWith(image);
    expect(setSignatureSource).toHaveBeenCalledWith(source);
  });

  it('delegates document pointer events', () => {
    const handlePointerMove = vi.fn();
    const handlePointerEnd = vi.fn();
    setupSignatureEventHandlers({
      loadPdf: vi.fn(),
      setSignatureImage: vi.fn(),
      setSignatureSource: vi.fn(),
      handlePointerMove,
      handlePointerEnd,
    });

    document.dispatchEvent(new Event('pointermove'));
    document.dispatchEvent(new Event('pointerup'));
    document.dispatchEvent(new Event('pointercancel'));

    expect(handlePointerMove).toHaveBeenCalledTimes(1);
    expect(handlePointerEnd).toHaveBeenCalledTimes(2);
  });
});
