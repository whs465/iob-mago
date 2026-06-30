import type { ObjectUrlRuntime } from './prepared-signature';

export type SignaturePreviewState = {
  readonly objectUrl: string | null;
  setObjectUrl(url: string, urls: Pick<ObjectUrlRuntime, 'revokeObjectURL'>): void;
  clear(urls: Pick<ObjectUrlRuntime, 'revokeObjectURL'>): void;
};

export function createSignaturePreviewState(): SignaturePreviewState {
  let objectUrl: string | null = null;

  const clear = (urls: Pick<ObjectUrlRuntime, 'revokeObjectURL'>) => {
    if (!objectUrl) return;
    urls.revokeObjectURL(objectUrl);
    objectUrl = null;
  };

  return {
    get objectUrl() {
      return objectUrl;
    },

    setObjectUrl(url, urls) {
      clear(urls);
      objectUrl = url;
    },

    clear,
  };
}
