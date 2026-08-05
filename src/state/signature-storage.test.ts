// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasStoredSignatureSlot,
  loadStoredSignatureImage,
  loadStoredSignatureImageFromSlot,
  loadStoredSignatureSize,
  loadStoredSignatureSlot,
  migrateLegacySignatureToSlot1,
  removeStoredSignatureSlot,
  saveSignatureImageFile,
  saveSignatureImageFileToSlot,
  saveSignatureSize,
  saveSignatureSlot,
} from './signature-storage';

describe('signature storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads stored signature image data and bytes', () => {
    localStorage.setItem('firmaImagen', JSON.stringify({
      dataUrl: 'data:image/png;base64,SGk=',
      nombre: 'firma.png',
      mimeType: 'image/png',
    }));

    const storedSignature = loadStoredSignatureImage();

    expect(storedSignature?.name).toBe('firma.png');
    expect(storedSignature?.dataUrl).toBe('data:image/png;base64,SGk=');
    expect(storedSignature?.mimeType).toBe('image/png');
    expect(new TextDecoder().decode(storedSignature?.bytes)).toBe('Hi');
  });

  it('removes corrupt stored signature image data', () => {
    localStorage.setItem('firmaImagen', '{bad-json');

    expect(loadStoredSignatureImage()).toBeNull();
    expect(localStorage.getItem('firmaImagen')).toBeNull();
  });

  it('loads legacy raw data-url payloads stored as a plain string', () => {
    localStorage.setItem('firmaImagen', JSON.stringify('data:image/png;base64,SGk='));

    const storedSignature = loadStoredSignatureImage();

    expect(storedSignature?.dataUrl).toBe('data:image/png;base64,SGk=');
    expect(storedSignature?.mimeType).toBe('image/png');
    expect(storedSignature?.name).toBe('');
  });

  it('loads legacy raw data-url payloads stored without JSON wrapping', () => {
    localStorage.setItem('firmaImagen', 'data:image/png;base64,SGk=');

    const storedSignature = loadStoredSignatureImage();

    expect(storedSignature?.dataUrl).toBe('data:image/png;base64,SGk=');
    expect(storedSignature?.mimeType).toBe('image/png');
    expect(storedSignature?.name).toBe('');
  });

  it('loads data urls even when they were persisted with wrapping quotes', () => {
    localStorage.setItem('firmaImagen', JSON.stringify({
      dataUrl: '"data:image/png;base64,SGk="',
      nombre: 'firma.png',
    }));

    const storedSignature = loadStoredSignatureImage();

    expect(storedSignature?.dataUrl).toBe('data:image/png;base64,SGk=');
    expect(storedSignature?.name).toBe('firma.png');
  });

  it('saves and loads signature size', () => {
    saveSignatureSize('140');

    expect(loadStoredSignatureSize()).toBe('140');
  });

  it('persists the signature image payload including mime type', async () => {
    const file = new File(['png'], 'firma.png', { type: 'image/png' });

    await saveSignatureImageFile(file);

    const storedValue = localStorage.getItem('firmaImagen');
    expect(storedValue).toContain('"nombre":"firma.png"');
    expect(storedValue).toContain('"mimeType":"image/png"');
  });
});

describe('multi-slot signature storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('slot persistence', () => {
    it('defaults to slot 1 when nothing is stored', () => {
      expect(loadStoredSignatureSlot()).toBe(1);
    });

    it('saves and loads slot 2', () => {
      saveSignatureSlot(2);
      expect(loadStoredSignatureSlot()).toBe(2);
    });

    it('saves and loads slot 1 explicitly', () => {
      saveSignatureSlot(1);
      expect(loadStoredSignatureSlot()).toBe(1);
    });

    it('treats invalid slot values as slot 1', () => {
      localStorage.setItem('firmaSlotSeleccionada', 'invalid');
      expect(loadStoredSignatureSlot()).toBe(1);
    });
  });

  describe('save and load slots', () => {
    it('saves and loads signature image in slot 1', async () => {
      const file = new File(['png1'], 'firma1.png', { type: 'image/png' });

      await saveSignatureImageFileToSlot(file, 1);

      const stored = loadStoredSignatureImageFromSlot(1);
      expect(stored?.name).toBe('firma1.png');
      expect(stored?.mimeType).toBe('image/png');

      // slot 2 should be empty
      expect(loadStoredSignatureImageFromSlot(2)).toBeNull();
    });

    it('saves and loads signature image in slot 2', async () => {
      const file = new File(['png2'], 'firma2.png', { type: 'image/png' });

      await saveSignatureImageFileToSlot(file, 2);

      const stored = loadStoredSignatureImageFromSlot(2);
      expect(stored?.name).toBe('firma2.png');
      expect(stored?.mimeType).toBe('image/png');

      // slot 1 should be empty
      expect(loadStoredSignatureImageFromSlot(1)).toBeNull();
    });

    it('stores both slots independently', async () => {
      const file1 = new File(['png1'], 'firma1.png', { type: 'image/png' });
      const file2 = new File(['png2'], 'firma2.png', { type: 'image/png' });

      await saveSignatureImageFileToSlot(file1, 1);
      await saveSignatureImageFileToSlot(file2, 2);

      const slot1 = loadStoredSignatureImageFromSlot(1);
      const slot2 = loadStoredSignatureImageFromSlot(2);

      expect(slot1?.name).toBe('firma1.png');
      expect(slot2?.name).toBe('firma2.png');
      expect(slot1?.mimeType).toBe('image/png');
      expect(slot2?.mimeType).toBe('image/png');
    });
  });

  describe('hasStoredSignatureSlot', () => {
    it('returns false for empty slots', () => {
      expect(hasStoredSignatureSlot(1)).toBe(false);
      expect(hasStoredSignatureSlot(2)).toBe(false);
    });

    it('returns true for populated slots', async () => {
      const file = new File(['png'], 'firma.png', { type: 'image/png' });
      await saveSignatureImageFileToSlot(file, 2);

      expect(hasStoredSignatureSlot(1)).toBe(false);
      expect(hasStoredSignatureSlot(2)).toBe(true);
    });
  });

  describe('removeStoredSignatureSlot', () => {
    it('removes a single slot without affecting the other', async () => {
      const file1 = new File(['png1'], 'firma1.png', { type: 'image/png' });
      const file2 = new File(['png2'], 'firma2.png', { type: 'image/png' });

      await saveSignatureImageFileToSlot(file1, 1);
      await saveSignatureImageFileToSlot(file2, 2);

      removeStoredSignatureSlot(1);

      expect(loadStoredSignatureImageFromSlot(1)).toBeNull();
      expect(loadStoredSignatureImageFromSlot(2)).not.toBeNull();
    });

    it('is a no-op on an already-empty slot', () => {
      removeStoredSignatureSlot(1);
      expect(loadStoredSignatureImageFromSlot(1)).toBeNull();
    });
  });

  describe('legacy migration', () => {
    it('migrates legacy firmaImagen into empty slot 1', () => {
      localStorage.setItem('firmaImagen', JSON.stringify({
        dataUrl: 'data:image/png;base64,SGk=',
        nombre: 'legacy.png',
        mimeType: 'image/png',
      }));

      const didMigrate = migrateLegacySignatureToSlot1();
      expect(didMigrate).toBe(true);

      const slot1 = loadStoredSignatureImageFromSlot(1);
      expect(slot1?.name).toBe('legacy.png');
      expect(slot1?.dataUrl).toBe('data:image/png;base64,SGk=');

      // Legacy key is not removed (kept for backward compat)
      expect(localStorage.getItem('firmaImagen')).not.toBeNull();
    });

    it('does not overwrite existing slot 1 during migration', () => {
      localStorage.setItem('firmaImagen_1', JSON.stringify({
        dataUrl: 'data:image/png;base64,QQ==',
        nombre: 'existing.png',
        mimeType: 'image/png',
      }));
      localStorage.setItem('firmaImagen', JSON.stringify({
        dataUrl: 'data:image/png;base64,SGk=',
        nombre: 'legacy.png',
        mimeType: 'image/png',
      }));

      const didMigrate = migrateLegacySignatureToSlot1();
      expect(didMigrate).toBe(false);

      const slot1 = loadStoredSignatureImageFromSlot(1);
      expect(slot1?.name).toBe('existing.png');
    });

    it('returns false when there is no legacy key', () => {
      const didMigrate = migrateLegacySignatureToSlot1();
      expect(didMigrate).toBe(false);
      expect(loadStoredSignatureImageFromSlot(1)).toBeNull();
    });

    it('returns false when legacy key is corrupt', () => {
      localStorage.setItem('firmaImagen', '{bad-json');
      const didMigrate = migrateLegacySignatureToSlot1();
      expect(didMigrate).toBe(false);
    });
  });

  describe('slot loading with corrupt data', () => {
    it('returns null and cleans up corrupt slot 1', () => {
      localStorage.setItem('firmaImagen_1', '{bad-json');
      expect(loadStoredSignatureImageFromSlot(1)).toBeNull();
      expect(localStorage.getItem('firmaImagen_1')).toBeNull();
    });

    it('returns null and cleans up corrupt slot 2', () => {
      localStorage.setItem('firmaImagen_2', '{bad-json');
      expect(loadStoredSignatureImageFromSlot(2)).toBeNull();
      expect(localStorage.getItem('firmaImagen_2')).toBeNull();
    });
  });
});
