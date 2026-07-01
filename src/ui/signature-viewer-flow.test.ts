import { describe, expect, it, vi } from 'vitest';
import { createSignatureDragState } from '../state/signature-drag';
import { createSignatureMarkerState } from '../state/signature-markers';
import { createSignatureViewerState, type SignaturePdfDocProxy } from '../state/signature-viewer';
import { resetSignaturePdfViewer } from './signature-viewer-flow';

function createPdfDocProxy(): SignaturePdfDocProxy {
  return {
    numPages: 3,
    getPage: vi.fn(),
  };
}

describe('signature viewer flow', () => {
  it('resets viewer, markers, drag state and related UI', () => {
    const viewerState = createSignatureViewerState();
    const markerState = createSignatureMarkerState();
    const dragState = createSignatureDragState();
    viewerState.load(new File(['pdf'], 'doc.pdf', { type: 'application/pdf' }), createPdfDocProxy(), 3);
    viewerState.setRenderedPageMetrics(500, 700, 1.2);
    markerState.addMarker({ page: 1, x: 10, y: 20, size: 100 });
    dragState.start(0);
    dragState.markMoved();

    const clearCanvas = vi.fn();
    const syncMarkerLayerSize = vi.fn();
    const hideViewer = vi.fn();
    const resetPageControls = vi.fn();
    const resetZoomControls = vi.fn();
    const updateMarkersDisplay = vi.fn();
    const updateSignatureList = vi.fn();
    const formatPageInfo = vi.fn((page: number, total: number) => `${page}/${total}`);
    const formatZoomInfo = vi.fn((zoomLevel: number) => `${zoomLevel}`);

    resetSignaturePdfViewer({
      viewerState,
      markerState,
      dragState,
      formatPageInfo,
      formatZoomInfo,
      updateMarkersDisplay,
      updateSignatureList,
      clearCanvas,
      syncMarkerLayerSize,
      hideViewer,
      resetPageControls,
      resetZoomControls,
    });

    expect(viewerState.file).toBeNull();
    expect(viewerState.pdfDocProxy).toBeNull();
    expect(viewerState.currentPage).toBe(1);
    expect(viewerState.totalPages).toBe(0);
    expect(viewerState.pageWidth).toBe(0);
    expect(markerState.markers).toEqual([]);
    expect(dragState.activeIndex).toBeNull();
    expect(dragState.movedDuringDrag).toBe(false);
    expect(clearCanvas).toHaveBeenCalledTimes(1);
    expect(syncMarkerLayerSize).toHaveBeenCalledWith(0, 0);
    expect(hideViewer).toHaveBeenCalledTimes(1);
    expect(resetPageControls).toHaveBeenCalledWith(formatPageInfo);
    expect(resetZoomControls).toHaveBeenCalledWith(formatZoomInfo);
    expect(updateMarkersDisplay).toHaveBeenCalledTimes(1);
    expect(updateSignatureList).toHaveBeenCalledTimes(1);
  });
});
