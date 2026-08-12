// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupSignatureEventHandlers } from './signature-events';

function renderSignatureInputs() {
  document.body.innerHTML = `
    <input id="sign-pdf-file" type="file" accept=".pdf" />
    <input id="sign-image-file-1" type="file" />
    <input id="sign-image-file-2" type="file" />
    <input id="signature-source-file" type="file" />
    <input id="signature-camera-file" type="file" accept="image/*" capture="environment" />
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
    const imageInput1 = document.getElementById('sign-image-file-1') as HTMLInputElement;
    const sourceInput = document.getElementById('signature-source-file') as HTMLInputElement;
    const cameraInput = document.getElementById('signature-camera-file') as HTMLInputElement;
    const cameraPhoto = new File(['camera'], 'camera.jpg', { type: 'image/jpeg' });

    setInputFiles(pdfInput, [pdf]);
    setInputFiles(imageInput1, [image]);
    setInputFiles(sourceInput, [source]);
    setInputFiles(cameraInput, [cameraPhoto]);
    pdfInput.dispatchEvent(new Event('change'));
    imageInput1.dispatchEvent(new Event('change'));
    sourceInput.dispatchEvent(new Event('change'));
    cameraInput.dispatchEvent(new Event('change'));

    expect(loadPdf).toHaveBeenCalledWith(pdf);
    expect(setSignatureImage).toHaveBeenCalledWith(image);
    expect(setSignatureSource).toHaveBeenCalledWith(source);
    expect(setSignatureSource).toHaveBeenCalledWith(cameraPhoto);
    expect(cameraInput.getAttribute('capture')).toBe('environment');
  });

  it('handles file selection from slot 2', () => {
    const setSignatureImage = vi.fn(async () => undefined);
    setupSignatureEventHandlers({
      loadPdf: vi.fn(),
      setSignatureImage,
      setSignatureSource: vi.fn(),
      handlePointerMove: vi.fn(),
      handlePointerEnd: vi.fn(),
    });

    const image = new File(['png2'], 'signature2.png', { type: 'image/png' });
    const imageInput2 = document.getElementById('sign-image-file-2') as HTMLInputElement;

    setInputFiles(imageInput2, [image]);
    imageInput2.dispatchEvent(new Event('change'));

    expect(setSignatureImage).toHaveBeenCalledWith(image);
  });

  it('rejects a non-PDF selected for the signature document', () => {
    const loadPdf = vi.fn(async () => undefined);
    const onPdfRejected = vi.fn();
    setupSignatureEventHandlers({
      loadPdf,
      setSignatureImage: vi.fn(),
      setSignatureSource: vi.fn(),
      handlePointerMove: vi.fn(),
      handlePointerEnd: vi.fn(),
      onPdfRejected,
    });

    const pdfInput = document.getElementById('sign-pdf-file') as HTMLInputElement;
    setInputFiles(pdfInput, [new File(['image'], 'photo.png', { type: 'image/png' })]);
    pdfInput.dispatchEvent(new Event('change'));

    expect(loadPdf).not.toHaveBeenCalled();
    expect(onPdfRejected).toHaveBeenCalledOnce();
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
