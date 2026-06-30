import type { ActiveSignatureState } from './active-signature';
import type { SignatureMarker, SignatureMarkerState } from './signature-markers';
import type { SignatureViewerState } from './signature-viewer';

export type CreateMarkerFromClick = (options: {
  event: MouseEvent;
  canvas: HTMLCanvasElement;
  viewerState: SignatureViewerState;
  size: number;
  aspectRatio: number;
}) => Promise<SignatureMarker | null>;

export type AddSignatureMarkerFromClickOptions = {
  event: MouseEvent;
  canvas: HTMLCanvasElement;
  viewerState: SignatureViewerState;
  markerState: SignatureMarkerState;
  activeSignatureState: ActiveSignatureState;
  size: number;
  createMarkerFromClick: CreateMarkerFromClick;
};

export type AddSignatureMarkerFromClickResult =
  | { status: 'missing-image' }
  | { status: 'no-marker' }
  | { status: 'ok'; marker: SignatureMarker };

export async function addSignatureMarkerFromClick({
  event,
  canvas,
  viewerState,
  markerState,
  activeSignatureState,
  size,
  createMarkerFromClick,
}: AddSignatureMarkerFromClickOptions): Promise<AddSignatureMarkerFromClickResult> {
  if (!activeSignatureState.hasImage) return { status: 'missing-image' };

  const marker = await createMarkerFromClick({
    event,
    canvas,
    viewerState,
    size,
    aspectRatio: activeSignatureState.aspectRatio,
  });
  if (!marker) return { status: 'no-marker' };

  markerState.addMarker(marker);
  return { status: 'ok', marker };
}
