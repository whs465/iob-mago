import { describe, expect, it } from 'vitest';
import { type LoadableImage, loadSignatureAspectRatio } from './signature-image';

class FakeImage implements LoadableImage {
  naturalWidth = 300;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private shouldFail = false;

  set src(value: string) {
    this.shouldFail = value === 'bad';
    setTimeout(() => {
      if (this.shouldFail) this.onerror?.();
      else this.onload?.();
    }, 0);
  }

  get src() {
    return '';
  }
}

class InvalidDimensionsImage extends FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
}

describe('signature image utilities', () => {
  it('loads an image aspect ratio', async () => {
    await expect(loadSignatureAspectRatio('ok', FakeImage)).resolves.toBe(3);
  });

  it('rejects failed image loads', async () => {
    await expect(loadSignatureAspectRatio('bad', FakeImage)).rejects.toThrow('could not be loaded');
  });

  it('rejects invalid image dimensions', async () => {
    await expect(loadSignatureAspectRatio('ok', InvalidDimensionsImage)).rejects.toThrow('Invalid signature image dimensions');
  });
});
