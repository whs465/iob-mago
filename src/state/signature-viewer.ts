export type SignaturePdfViewport = {
  width: number;
  height: number;
};

export type SignaturePdfPageProxy = {
  view: readonly number[];
  getViewport(options: { scale: number }): SignaturePdfViewport;
  render(context: Record<string, unknown>): { promise: Promise<void> };
};

export type SignaturePdfDocProxy = {
  numPages: number;
  getPage(pageNumber: number): Promise<SignaturePdfPageProxy>;
};

export type SignatureViewerState = {
  readonly file: File | null;
  readonly pdfDocProxy: SignaturePdfDocProxy | null;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly currentScale: number;
  readonly zoomLevel: number;
  readonly minZoomLevel: number;
  readonly maxZoomLevel: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  reset(): void;
  load(file: File, pdfDocProxy: SignaturePdfDocProxy, totalPages: number): void;
  clearLoadedPdf(): void;
  setRenderedPageMetrics(width: number, height: number, scale: number): void;
  canMovePage(delta: number): boolean;
  movePage(delta: number): number | null;
  canZoomOut(): boolean;
  canZoomIn(): boolean;
  zoomOut(): number | null;
  zoomIn(): number | null;
  resetZoom(): number;
};

export function createSignatureViewerState(): SignatureViewerState {
  const minZoomLevel = 1;
  const maxZoomLevel = 2;
  const zoomStep = 0.25;
  let file: File | null = null;
  let pdfDocProxy: SignaturePdfDocProxy | null = null;
  let currentPage = 1;
  let totalPages = 0;
  let currentScale = 1;
  let zoomLevel = 1;
  let pageWidth = 0;
  let pageHeight = 0;

  const resetPageMetrics = () => {
    currentScale = 1;
    zoomLevel = 1;
    pageWidth = 0;
    pageHeight = 0;
  };

  return {
    get file() {
      return file;
    },

    get pdfDocProxy() {
      return pdfDocProxy;
    },

    get currentPage() {
      return currentPage;
    },

    get totalPages() {
      return totalPages;
    },

    get currentScale() {
      return currentScale;
    },

    get zoomLevel() {
      return zoomLevel;
    },

    get minZoomLevel() {
      return minZoomLevel;
    },

    get maxZoomLevel() {
      return maxZoomLevel;
    },

    get pageWidth() {
      return pageWidth;
    },

    get pageHeight() {
      return pageHeight;
    },

    reset() {
      file = null;
      pdfDocProxy = null;
      currentPage = 1;
      totalPages = 0;
      resetPageMetrics();
    },

    load(nextFile, nextPdfDocProxy, nextTotalPages) {
      file = nextFile;
      pdfDocProxy = nextPdfDocProxy;
      totalPages = nextTotalPages;
      currentPage = 1;
      resetPageMetrics();
    },

    clearLoadedPdf() {
      file = null;
      pdfDocProxy = null;
      currentPage = 1;
      totalPages = 0;
      resetPageMetrics();
    },

    setRenderedPageMetrics(width, height, scale) {
      pageWidth = width;
      pageHeight = height;
      currentScale = scale;
    },

    canMovePage(delta) {
      const nextPage = currentPage + delta;
      return nextPage >= 1 && nextPage <= totalPages;
    },

    movePage(delta) {
      if (!this.canMovePage(delta)) return null;
      currentPage += delta;
      return currentPage;
    },

    canZoomOut() {
      return zoomLevel > minZoomLevel;
    },

    canZoomIn() {
      return zoomLevel < maxZoomLevel;
    },

    zoomOut() {
      if (!this.canZoomOut()) return null;
      zoomLevel = Math.max(minZoomLevel, zoomLevel - zoomStep);
      return zoomLevel;
    },

    zoomIn() {
      if (!this.canZoomIn()) return null;
      zoomLevel = Math.min(maxZoomLevel, zoomLevel + zoomStep);
      return zoomLevel;
    },

    resetZoom() {
      zoomLevel = 1;
      return zoomLevel;
    },
  };
}
