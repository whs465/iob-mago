export type SignatureMarker = {
  page: number;
  x: number;
  y: number;
  size: number;
  canvasX?: number;
  canvasY?: number;
};

export type SignatureMarkerState = {
  readonly markers: SignatureMarker[];
  addMarker(marker: SignatureMarker): void;
  removeMarker(index: number): boolean;
  clear(): void;
  setAllSizes(size: number): void;
  getMarker(index: number | null): SignatureMarker | null;
  hasMarkers(): boolean;
  getFirstMarker(): SignatureMarker | null;
};

function isValidIndex(index: number | null, length: number): index is number {
  return (
    typeof index === 'number'
    && !Number.isNaN(index)
    && index >= 0
    && index < length
  );
}

export function createSignatureMarkerState(): SignatureMarkerState {
  let markers: SignatureMarker[] = [];

  return {
    get markers() {
      return markers;
    },

    addMarker(marker) {
      markers = [...markers, marker];
    },

    removeMarker(index) {
      if (!isValidIndex(index, markers.length)) return false;
      markers = markers.filter((_, markerIndex) => markerIndex !== index);
      return true;
    },

    clear() {
      markers = [];
    },

    setAllSizes(size) {
      markers = markers.map(marker => ({ ...marker, size }));
    },

    getMarker(index) {
      if (!isValidIndex(index, markers.length)) return null;
      return markers[index];
    },

    hasMarkers() {
      return markers.length > 0;
    },

    getFirstMarker() {
      return markers[0] ?? null;
    },
  };
}
