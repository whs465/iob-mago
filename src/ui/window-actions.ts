export type WindowPdfActions = Pick<Window,
  | 'unirPDFs'
  | 'separarPDF'
  | 'extraerPaginas'
  | 'eliminarPaginas'
  | 'ordenarPaginasPdf'
  | 'rotarPaginasPortrait'
  | 'changePage'
  | 'zoomOutPdf'
  | 'resetPdfZoom'
  | 'zoomInPdf'
  | 'clearMarkers'
  | 'handleCanvasClick'
  | 'applySignatures'
  | 'generateSignaturePng'
  | 'downloadPreparedSignature'
  | 'usePreparedSignature'
  | 'removeSignature'
>;

export function registerWindowPdfActions(actions: WindowPdfActions) {
  Object.assign(window, actions);
}
