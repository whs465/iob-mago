// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  renderSignatureList,
  renderSignatureMarkerList,
  renderSignatureMarkerOverlay,
  renderSignatureMarkers,
  stopSignatureMarkerEvent,
} from './signature-markers';

const markers = [
  { page: 1, x: 10.2, y: 20.8, size: 100 },
  { page: 2, x: 30, y: 40, size: 120 },
];

describe('signature marker UI helpers', () => {
  it('renders only current-page canvas markers with positions and actions', () => {
    const container = document.createElement('div');
    const onStartDrag = vi.fn((_: number, event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    });
    const onRemove = vi.fn();

    renderSignatureMarkers(
      container,
      markers,
      {
        activeIndex: 0,
        currentPage: 1,
        getPosition: marker => ({ x: marker.x * 2, y: marker.y * 2 }),
        getDimensions: marker => ({ width: marker.size, height: marker.size / 2 }),
      },
      { onStartDrag, onRemove },
    );

    const markerElement = container.querySelector<HTMLElement>('.signature-marker');
    expect(container.querySelectorAll('.signature-marker')).toHaveLength(1);
    expect(markerElement?.classList.contains('dragging')).toBe(true);
    expect(markerElement?.style.left).toBe('20.4px');
    expect(markerElement?.style.top).toBe('41.6px');
    expect(markerElement?.style.width).toBe('100px');
    expect(markerElement?.style.height).toBe('50px');
    expect(markerElement?.querySelector('.signature-marker-size')?.textContent).toBe('100px');

    markerElement?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    container.querySelector<HTMLButtonElement>('.signature-marker-delete')?.click();

    expect(onStartDrag).toHaveBeenCalledWith(0, expect.any(PointerEvent));
    expect(onRemove).toHaveBeenCalledWith(0, expect.any(Event));
  });

  it('renders an empty signature list message', () => {
    const list = document.createElement('div');

    renderSignatureList(
      list,
      [],
      { empty: 'No markers', page: page => `Page ${page}` },
      { onRemove: vi.fn() },
    );

    expect(list.querySelector('p')?.textContent).toBe('No markers');
    expect(list.querySelector('p')?.style.color).toBe('rgb(136, 146, 176)');
  });

  it('renders signature list items with remove actions', () => {
    const list = document.createElement('div');
    const onRemove = vi.fn();

    renderSignatureList(
      list,
      markers,
      { empty: 'No markers', page: page => `Page ${page}` },
      { onRemove },
    );

    expect(list.querySelectorAll('.signature-item')).toHaveLength(2);
    expect(list.querySelector('.signature-item-page')?.textContent).toBe('Page 1');
    expect(list.querySelector('.signature-item-coords')?.textContent).toBe('X: 10, Y: 21');

    list.querySelector<HTMLButtonElement>('.btn-apply')?.click();

    expect(onRemove).toHaveBeenCalledWith(0, expect.any(Event));
  });

  it('coordinates marker overlay and list rendering', () => {
    const container = document.createElement('div');
    const list = document.createElement('div');

    renderSignatureMarkerOverlay({
      container,
      markers,
      activeIndex: null,
      currentPage: 1,
      getPosition: marker => ({ x: marker.x, y: marker.y }),
      getDimensions: marker => ({ width: marker.size, height: marker.size }),
    }, {
      onStartDrag: vi.fn(),
      onRemove: vi.fn(),
    });

    renderSignatureMarkerList({
      list,
      markers,
      labels: { empty: 'No markers', page: page => `Page ${page}` },
    }, {
      onRemove: vi.fn(),
    });

    expect(container.querySelectorAll('.signature-marker')).toHaveLength(1);
    expect(list.querySelectorAll('.signature-item')).toHaveLength(2);
  });

  it('renders the signature preview image inside the marker when available', () => {
    const container = document.createElement('div');

    renderSignatureMarkerOverlay({
      container,
      markers,
      activeIndex: null,
      currentPage: 1,
      getPosition: marker => ({ x: marker.x, y: marker.y }),
      getDimensions: marker => ({ width: marker.size, height: marker.size / 2 }),
      imageUrl: 'blob:signature-preview',
    }, {
      onStartDrag: vi.fn(),
      onRemove: vi.fn(),
    });

    const image = container.querySelector<HTMLImageElement>('.signature-marker-image');
    expect(image?.src).toBe('blob:signature-preview');
  });

  it('stops signature marker events', () => {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;

    stopSignatureMarkerEvent(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });
});
