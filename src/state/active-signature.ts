export type ActiveSignatureState = {
  readonly imageBytes: ArrayBuffer | null;
  readonly imageType: string | null;
  readonly aspectRatio: number;
  readonly hasImage: boolean;
  readonly currentSlot: 1 | 2;
  setImage(bytes: ArrayBuffer, imageType?: string | null): void;
  setAspectRatio(aspectRatio: number): void;
  resetAspectRatio(): void;
  setSlot(slot: 1 | 2): void;
  clear(): void;
};

export function createActiveSignatureState(): ActiveSignatureState {
  let imageBytes: ArrayBuffer | null = null;
  let imageType: string | null = null;
  let aspectRatio = 1;
  let currentSlot: 1 | 2 = 1;

  return {
    get imageBytes() {
      return imageBytes;
    },

    get imageType() {
      return imageType;
    },

    get aspectRatio() {
      return aspectRatio;
    },

    get hasImage() {
      return !!imageBytes;
    },

    get currentSlot() {
      return currentSlot;
    },

    setImage(bytes, nextImageType = null) {
      imageBytes = bytes;
      imageType = nextImageType;
    },

    setAspectRatio(nextAspectRatio) {
      aspectRatio = nextAspectRatio;
    },

    resetAspectRatio() {
      aspectRatio = 1;
    },

    setSlot(slot) {
      currentSlot = slot;
    },

    clear() {
      imageBytes = null;
      imageType = null;
      aspectRatio = 1;
    },
  };
}
