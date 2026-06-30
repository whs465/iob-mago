import type { SignatureMarkerState } from './signature-markers';

export type SaveSignatureSize = (size: string) => void;

export function removeSignatureMarker(state: SignatureMarkerState, index: number) {
  return state.removeMarker(index);
}

export function clearSignatureMarkers(state: SignatureMarkerState) {
  const hadMarkers = state.hasMarkers();
  state.clear();
  return hadMarkers;
}

export function resizeSignatureMarkers(
  state: SignatureMarkerState,
  sizeValue: string,
  saveSignatureSize: SaveSignatureSize,
) {
  const size = parseInt(sizeValue);
  state.setAllSizes(size);
  saveSignatureSize(sizeValue);
  return size;
}
