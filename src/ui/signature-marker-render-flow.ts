import { clearSignatureMarkers, resizeSignatureMarkers, type SaveSignatureSize } from '../state/signature-marker-actions';
import type { SignatureDragState } from '../state/signature-drag';
import type { SignatureMarkerState } from '../state/signature-markers';
import type { SignatureViewerState } from '../state/signature-viewer';
import type { Dimensions, Point } from '../utils/signature-geometry';
import {
  renderSignatureMarkerList,
  renderSignatureMarkerOverlay,
  stopSignatureMarkerEvent,
} from './signature-markers';
import type { SignatureMetaTranslator } from './signature-preview';

export type SignatureMarkerRenderFlowOptions = {
  markerState: SignatureMarkerState;
  dragState: SignatureDragState;
  viewerState: SignatureViewerState;
  container: HTMLElement | null;
  list: HTMLElement | null;
  i18n: SignatureMetaTranslator;
  getPosition(marker: Parameters<typeof renderSignatureMarkerOverlay>[0]['markers'][number]): Point;
  getDimensions(marker: Parameters<typeof renderSignatureMarkerOverlay>[0]['markers'][number]): Dimensions;
  imageUrl?: string;
  onStartDrag(index: number): void;
  onRemove(index: number): void;
};

export function renderSignatureMarkerOverlayFlow({
  markerState,
  dragState,
  viewerState,
  container,
  getPosition,
  getDimensions,
  imageUrl,
  onStartDrag,
  onRemove,
}: Omit<SignatureMarkerRenderFlowOptions, 'list' | 'i18n'>) {
  if (!container) return;

  renderSignatureMarkerOverlay({
    container,
    markers: markerState.markers,
    activeIndex: dragState.activeIndex,
    currentPage: viewerState.currentPage,
    getPosition,
    getDimensions,
    imageUrl,
  }, {
    onStartDrag: (index, event) => {
      stopSignatureMarkerEvent(event);
      onStartDrag(index);
    },
    onRemove: (index, event) => {
      stopSignatureMarkerEvent(event);
      onRemove(index);
    },
  });
}

export function renderSignatureMarkerListFlow({
  markerState,
  list,
  i18n,
  onRemove,
}: Pick<SignatureMarkerRenderFlowOptions, 'markerState' | 'list' | 'i18n' | 'onRemove'>) {
  if (!list) return;

  renderSignatureMarkerList({
    list,
    markers: markerState.markers,
    labels: {
      empty: i18n('No signature markers yet', 'No hay firmas marcadas'),
      page: page => i18n('Page {{page}}', 'Página {{page}}', { page: String(page) }),
    },
  }, {
    onRemove: (index, event) => {
      stopSignatureMarkerEvent(event);
      onRemove(index);
    },
  });
}

export function clearSignatureMarkersFlow(
  markerState: SignatureMarkerState,
  updateMarkersDisplay: () => void,
  updateSignatureList: () => void,
) {
  clearSignatureMarkers(markerState);
  updateMarkersDisplay();
  updateSignatureList();
}

export function resizeSignatureMarkersFlow(
  markerState: SignatureMarkerState,
  sizeValue: string,
  saveSignatureSize: SaveSignatureSize,
  updateMarkersDisplay: () => void,
) {
  const size = resizeSignatureMarkers(markerState, sizeValue, saveSignatureSize);
  updateMarkersDisplay();
  return size;
}
