export type ActiveSignatureState = {
  readonly imageBytes: ArrayBuffer | null;
  readonly aspectRatio: number;
  readonly hasImage: boolean;
  setImageBytes(bytes: ArrayBuffer): void;
  setAspectRatio(aspectRatio: number): void;
  resetAspectRatio(): void;
  clear(): void;
};

export function createActiveSignatureState(): ActiveSignatureState {
  let imageBytes: ArrayBuffer | null = null;
  let aspectRatio = 1;

  return {
    get imageBytes() {
      return imageBytes;
    },

    get aspectRatio() {
      return aspectRatio;
    },

    get hasImage() {
      return !!imageBytes;
    },

    setImageBytes(bytes) {
      imageBytes = bytes;
    },

    setAspectRatio(nextAspectRatio) {
      aspectRatio = nextAspectRatio;
    },

    resetAspectRatio() {
      aspectRatio = 1;
    },

    clear() {
      imageBytes = null;
      aspectRatio = 1;
    },
  };
}
