/* eslint-disable @typescript-eslint/no-unused-vars, no-var */

interface Window {
  unirPDFs: () => Promise<void>;
  separarPDF: () => Promise<void>;
  extraerPaginas: () => Promise<void>;
  eliminarPaginas: () => Promise<void>;
  ordenarPaginasPdf: () => Promise<void>;
  rotarPaginasPortrait: () => Promise<void>;
  comprimirPDF: () => Promise<void>;
  quitarClavePDF: () => Promise<void>;
  verMetadatosPDF: () => Promise<void>;
  guardarMetadatosPDF: () => Promise<void>;
  borrarMetadatosPDF: () => Promise<void>;
  agregarMarcaAgua: () => Promise<void>;
  changePage: (direction: number) => void;
  goToFirstPage: () => Promise<void>;
  goToLastPage: () => Promise<void>;
  zoomOutPdf: () => Promise<void>;
  resetPdfZoom: () => Promise<void>;
  zoomInPdf: () => Promise<void>;
  clearMarkers: () => void;
  handleCanvasClick: (event: MouseEvent) => Promise<void>;
  applySignatures: () => Promise<void>;
  generateSignaturePng: (options?: { silent?: boolean }) => Promise<void>;
  downloadPreparedSignature: () => void;
  usePreparedSignature: () => Promise<void>;
  removeSignature: (index: number) => void;
}
