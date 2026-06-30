import { removeSignatureMarker } from '../state/signature-marker-actions';
import type { ActiveSignatureState } from '../state/active-signature';
import type { SignatureMarkerState } from '../state/signature-markers';
import type { SignatureViewerState } from '../state/signature-viewer';
import {
  addSignatureMarkerFromClick,
  type CreateMarkerFromClick,
} from '../state/signature-marker-click-action';
import type { StatusType } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';
import { getMarkerPdfPositionFromCanvas } from '../utils/signature-geometry';

export type HandleSignatureCanvasClickOptions = {
  event: MouseEvent;
  canvas: HTMLCanvasElement;
  viewerState: SignatureViewerState;
  markerState: SignatureMarkerState;
  activeSignatureState: ActiveSignatureState;
  size: number;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: StatusType): void;
  createMarkerFromClick: CreateMarkerFromClick;
  updateMarkersDisplay(): void;
  updateSignatureList(): void;
};

export async function handleSignatureCanvasClickFlow({
  event,
  canvas,
  viewerState,
  markerState,
  activeSignatureState,
  size,
  i18n,
  showStatus,
  createMarkerFromClick,
  updateMarkersDisplay,
  updateSignatureList,
}: HandleSignatureCanvasClickOptions) {
  const result = await addSignatureMarkerFromClick({
    event,
    canvas,
    viewerState,
    markerState,
    activeSignatureState,
    size,
    createMarkerFromClick,
  });

  if (result.status === 'missing-image') {
    showStatus(
      i18n('Upload a signature image first', 'Primero sube una imagen de firma'),
      'error',
    );
    return result;
  }

  if (result.status === 'no-marker') return result;

  updateMarkersDisplay();
  updateSignatureList();
  return result;
}

export type RemoveSignatureMarkerFlowOptions = {
  markerState: SignatureMarkerState;
  index: number;
  updateMarkersDisplay(): void;
  updateSignatureList(): void;
};

export function removeSignatureMarkerFlow({
  markerState,
  index,
  updateMarkersDisplay,
  updateSignatureList,
}: RemoveSignatureMarkerFlowOptions) {
  if (!removeSignatureMarker(markerState, index)) return false;

  updateMarkersDisplay();
  updateSignatureList();
  return true;
}

export type AutoPlaceSignatureMarkerOptions = {
  canvas: HTMLCanvasElement | null;
  viewerState: SignatureViewerState;
  markerState: SignatureMarkerState;
  activeSignatureState: ActiveSignatureState;
  size: number;
  updateMarkersDisplay(): void;
  updateSignatureList(): void;
};

export async function autoPlaceSignatureMarker({
  canvas,
  viewerState,
  markerState,
  activeSignatureState,
  size,
  updateMarkersDisplay,
  updateSignatureList,
}: AutoPlaceSignatureMarkerOptions) {
  if (!canvas) return false;
  if (!viewerState.pdfDocProxy) return false;
  if (!activeSignatureState.hasImage) return false;
  if (markerState.hasMarkers()) return false;

  const pdfDocProxy = viewerState.pdfDocProxy;
  const pdfPage = await pdfDocProxy.getPage(viewerState.currentPage);

  const center = {
    x: canvas.width / 2,
    y: canvas.height / 2,
  };

  const position = getMarkerPdfPositionFromCanvas(
    { size },
    center,
    { width: canvas.width, height: canvas.height },
    { width: pdfPage.view[2], height: pdfPage.view[3] },
    activeSignatureState.aspectRatio,
  );
  if (!position) return false;

  markerState.addMarker({
    page: viewerState.currentPage,
    size,
    ...position,
  });

  updateMarkersDisplay();
  updateSignatureList();
  return true;
}
