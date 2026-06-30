export type SignatureDragState = {
  readonly activeIndex: number | null;
  readonly movedDuringDrag: boolean;
  start(index: number): void;
  markMoved(): void;
  stop(): { activeIndex: number | null; movedDuringDrag: boolean };
  reset(): void;
};

export function createSignatureDragState(): SignatureDragState {
  let activeIndex: number | null = null;
  let movedDuringDrag = false;

  return {
    get activeIndex() {
      return activeIndex;
    },

    get movedDuringDrag() {
      return movedDuringDrag;
    },

    start(index) {
      activeIndex = index;
      movedDuringDrag = false;
    },

    markMoved() {
      movedDuringDrag = true;
    },

    stop() {
      const result = { activeIndex, movedDuringDrag };
      activeIndex = null;
      movedDuringDrag = false;
      return result;
    },

    reset() {
      activeIndex = null;
      movedDuringDrag = false;
    },
  };
}
