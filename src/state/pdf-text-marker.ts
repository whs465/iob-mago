export type PdfTextMarker = {
  page: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
};

export type PdfTextMarkerState = {
  readonly marker: PdfTextMarker | null;
  set(marker: PdfTextMarker): void;
  updateText(text: string): void;
  updateFontSize(fontSize: number): void;
  clear(): void;
};

export function createPdfTextMarkerState(): PdfTextMarkerState {
  let marker: PdfTextMarker | null = null;

  return {
    get marker() {
      return marker;
    },

    set(nextMarker) {
      marker = { ...nextMarker };
    },

    updateText(text) {
      if (marker) marker = { ...marker, text };
    },

    updateFontSize(fontSize) {
      if (marker) marker = { ...marker, fontSize };
    },

    clear() {
      marker = null;
    },
  };
}
