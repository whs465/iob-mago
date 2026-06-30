export type SignatureGeneratorState = {
  readonly sourceFile: File | null;
  readonly sourceVersion: number;
  readonly isGenerating: boolean;
  readonly regenerateQueued: boolean;
  readonly canAdjustSourceImage: boolean;
  setSourceFile(file: File): void;
  beginGeneration(): boolean;
  finishGeneration(): void;
  queueRegeneration(): void;
  consumeQueuedRegeneration(): boolean;
  isSourceVersionCurrent(version: number): boolean;
  setRecolorTimer(timer: ReturnType<typeof setTimeout> | null): void;
  clearRecolorTimer(): void;
  setRegenerateTimer(timer: ReturnType<typeof setTimeout> | null): void;
  clearRegenerateTimer(): void;
  reset(): void;
};

export function createSignatureGeneratorState(): SignatureGeneratorState {
  let sourceFile: File | null = null;
  let sourceVersion = 0;
  let isGenerating = false;
  let regenerateQueued = false;
  let recolorTimer: ReturnType<typeof setTimeout> | null = null;
  let regenerateTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRecolorTimer = () => {
    if (recolorTimer) clearTimeout(recolorTimer);
    recolorTimer = null;
  };

  const clearRegenerateTimer = () => {
    if (regenerateTimer) clearTimeout(regenerateTimer);
    regenerateTimer = null;
  };

  return {
    get sourceFile() {
      return sourceFile;
    },

    get sourceVersion() {
      return sourceVersion;
    },

    get isGenerating() {
      return isGenerating;
    },

    get regenerateQueued() {
      return regenerateQueued;
    },

    get canAdjustSourceImage() {
      return !!sourceFile && !isGenerating;
    },

    setSourceFile(file) {
      sourceFile = file;
      sourceVersion++;
    },

    beginGeneration() {
      if (isGenerating) {
        regenerateQueued = true;
        return false;
      }
      isGenerating = true;
      return true;
    },

    finishGeneration() {
      isGenerating = false;
    },

    queueRegeneration() {
      regenerateQueued = true;
    },

    consumeQueuedRegeneration() {
      if (!regenerateQueued) return false;
      regenerateQueued = false;
      return true;
    },

    isSourceVersionCurrent(version) {
      return sourceVersion === version;
    },

    setRecolorTimer(timer) {
      clearRecolorTimer();
      recolorTimer = timer;
    },

    clearRecolorTimer,

    setRegenerateTimer(timer) {
      clearRegenerateTimer();
      regenerateTimer = timer;
    },

    clearRegenerateTimer,

    reset() {
      clearRecolorTimer();
      clearRegenerateTimer();
      regenerateQueued = false;
    },
  };
}
