import type { SignatureMarker } from '../state/signature-markers';
import type { Dimensions, Point } from '../utils/signature-geometry';

export type SignatureMarkerRenderCallbacks = {
  onStartDrag(index: number, event: PointerEvent): void;
  onRemove(index: number, event: Event): void;
};

export type SignatureMarkerRenderOptions = {
  activeIndex: number | null;
  currentPage: number;
  getPosition(marker: SignatureMarker): Point;
  getDimensions(marker: SignatureMarker): Dimensions;
  imageUrl?: string;
};

export type SignatureListLabels = {
  empty: string;
  page(pageNumber: number): string;
};

export type SignatureListCallbacks = {
  onRemove(index: number, event: Event): void;
};

export function stopSignatureMarkerEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

export function renderSignatureMarkers(
  container: HTMLElement,
  markers: SignatureMarker[],
  options: SignatureMarkerRenderOptions,
  callbacks: SignatureMarkerRenderCallbacks,
) {
  container.innerHTML = '';

  markers.forEach((marker, index) => {
    if (marker.page !== options.currentPage) return;

    const position = options.getPosition(marker);
    const dimensions = options.getDimensions(marker);
    const markerElement = document.createElement('div');
    markerElement.className = 'signature-marker';
    if (options.activeIndex === index) markerElement.classList.add('dragging');
    markerElement.style.left = `${position.x}px`;
    markerElement.style.top = `${position.y}px`;
    markerElement.style.width = `${dimensions.width}px`;
    markerElement.style.height = `${dimensions.height}px`;

    if (options.imageUrl) {
      const img = document.createElement('img');
      img.src = options.imageUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      img.style.pointerEvents = 'none';
      markerElement.appendChild(img);
    }

    markerElement.addEventListener('pointerdown', event => {
      if ((event.target as Element | null)?.closest('.signature-marker-delete')) return;
      callbacks.onStartDrag(index, event);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'signature-marker-delete';
    deleteButton.textContent = '✕';
    deleteButton.addEventListener('click', event => {
      callbacks.onRemove(index, event);
    });

    markerElement.appendChild(deleteButton);
    container.appendChild(markerElement);
  });
}

export type SignatureMarkerOverlayRenderOptions = SignatureMarkerRenderOptions & {
  container: HTMLElement;
  markers: SignatureMarker[];
  imageUrl?: string;
};

export function renderSignatureMarkerOverlay(
  options: SignatureMarkerOverlayRenderOptions,
  callbacks: SignatureMarkerRenderCallbacks,
) {
  renderSignatureMarkers(
    options.container,
    options.markers,
    {
      activeIndex: options.activeIndex,
      currentPage: options.currentPage,
      getPosition: options.getPosition,
      getDimensions: options.getDimensions,
      imageUrl: options.imageUrl,
    },
    callbacks,
  );
}

export function renderSignatureList(
  list: HTMLElement,
  markers: SignatureMarker[],
  labels: SignatureListLabels,
  callbacks: SignatureListCallbacks,
) {
  list.innerHTML = '';

  if (markers.length === 0) {
    const empty = document.createElement('p');
    empty.style.color = '#8892b0';
    empty.style.fontSize = '0.9rem';
    empty.textContent = labels.empty;
    list.appendChild(empty);
    return;
  }

  markers.forEach((marker, index) => {
    const item = document.createElement('div');
    item.className = 'signature-item';

    const info = document.createElement('div');
    info.className = 'signature-item-info';

    const page = document.createElement('span');
    page.className = 'signature-item-page';
    page.textContent = labels.page(marker.page);

    const coords = document.createElement('div');
    coords.className = 'signature-item-coords';
    coords.textContent = `X: ${Math.round(marker.x)}, Y: ${Math.round(marker.y)}`;

    info.append(page, coords);

    const actions = document.createElement('div');
    actions.className = 'signature-item-actions';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn-apply';
    remove.textContent = '✕';
    remove.addEventListener('click', event => {
      callbacks.onRemove(index, event);
    });

    actions.appendChild(remove);
    item.append(info, actions);
    list.appendChild(item);
  });
}

export type SignatureListRenderOptions = {
  list: HTMLElement;
  markers: SignatureMarker[];
  labels: SignatureListLabels;
};

export function renderSignatureMarkerList(
  options: SignatureListRenderOptions,
  callbacks: SignatureListCallbacks,
) {
  renderSignatureList(options.list, options.markers, options.labels, callbacks);
}
