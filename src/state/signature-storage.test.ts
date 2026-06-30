// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadStoredSignatureImage,
  loadStoredSignatureSize,
  saveSignatureSize,
} from './signature-storage';

describe('signature storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads stored signature image data and bytes', () => {
    localStorage.setItem('firmaImagen', JSON.stringify({
      dataUrl: 'data:image/png;base64,SGk=',
      nombre: 'firma.png',
    }));

    const storedSignature = loadStoredSignatureImage();

    expect(storedSignature?.name).toBe('firma.png');
    expect(storedSignature?.dataUrl).toBe('data:image/png;base64,SGk=');
    expect(new TextDecoder().decode(storedSignature?.bytes)).toBe('Hi');
  });

  it('removes corrupt stored signature image data', () => {
    localStorage.setItem('firmaImagen', '{bad-json');

    expect(loadStoredSignatureImage()).toBeNull();
    expect(localStorage.getItem('firmaImagen')).toBeNull();
  });

  it('saves and loads signature size', () => {
    saveSignatureSize('140');

    expect(loadStoredSignatureSize()).toBe('140');
  });
});
