/* eslint-disable @typescript-eslint/no-unused-vars, no-var */

interface Window {
  unirPDFs: () => Promise<void>;
  separarPDF: () => Promise<void>;
  extraerPaginas: () => Promise<void>;
  eliminarPaginas: () => Promise<void>;
  ordenarPaginasPdf: () => Promise<void>;
  rotarPaginasPortrait: () => Promise<void>;
  changePage: (direction: number) => void;
  clearMarkers: () => void;
  handleCanvasClick: (event: MouseEvent) => Promise<void>;
  applySignatures: () => Promise<void>;
  generateSignaturePng: (options?: { silent?: boolean }) => Promise<void>;
  downloadPreparedSignature: () => void;
  usePreparedSignature: () => Promise<void>;
  removeSignature: (index: number) => void;
}
