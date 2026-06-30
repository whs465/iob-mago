import type { PreparedSignaturePng } from '../pdf/signature-preparation';

export type ObjectUrlRuntime = {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
};

export type PreparedSignatureState = {
  readonly blob: Blob | null;
  readonly fileName: string;
  readonly previewUrl: string | null;
  readonly canvas: HTMLCanvasElement | null;
  readonly hasPreparedSignature: boolean;
  setPrepared(prepared: PreparedSignaturePng, urls: ObjectUrlRuntime): string;
  updateBlob(blob: Blob, urls: ObjectUrlRuntime): string;
  reset(urls: Pick<ObjectUrlRuntime, 'revokeObjectURL'>): void;
};

export function createPreparedSignatureState(): PreparedSignatureState {
  let blob: Blob | null = null;
  let fileName = '';
  let previewUrl: string | null = null;
  let canvas: HTMLCanvasElement | null = null;

  const revokePreviewUrl = (urls: Pick<ObjectUrlRuntime, 'revokeObjectURL'>) => {
    if (!previewUrl) return;
    urls.revokeObjectURL(previewUrl);
    previewUrl = null;
  };

  return {
    get blob() {
      return blob;
    },

    get fileName() {
      return fileName;
    },

    get previewUrl() {
      return previewUrl;
    },

    get canvas() {
      return canvas;
    },

    get hasPreparedSignature() {
      return !!blob && !!canvas;
    },

    setPrepared(prepared, urls) {
      revokePreviewUrl(urls);
      canvas = prepared.canvas;
      blob = prepared.blob;
      fileName = prepared.fileName;
      previewUrl = urls.createObjectURL(blob);
      return previewUrl;
    },

    updateBlob(nextBlob, urls) {
      revokePreviewUrl(urls);
      blob = nextBlob;
      previewUrl = urls.createObjectURL(blob);
      return previewUrl;
    },

    reset(urls) {
      revokePreviewUrl(urls);
      blob = null;
      fileName = '';
      canvas = null;
    },
  };
}
