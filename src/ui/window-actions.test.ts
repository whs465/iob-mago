// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { registerWindowPdfActions } from './window-actions';

describe('registerWindowPdfActions', () => {
  it('publishes PDF actions on window', () => {
    const actions = {
      unirPDFs: vi.fn(async () => undefined),
      separarPDF: vi.fn(async () => undefined),
      extraerPaginas: vi.fn(async () => undefined),
      eliminarPaginas: vi.fn(async () => undefined),
      ordenarPaginasPdf: vi.fn(async () => undefined),
      rotarPaginasPortrait: vi.fn(async () => undefined),
      comprimirPDF: vi.fn(async () => undefined),
      quitarClavePDF: vi.fn(async () => undefined),
      verMetadatosPDF: vi.fn(async () => undefined),
      guardarMetadatosPDF: vi.fn(async () => undefined),
      borrarMetadatosPDF: vi.fn(async () => undefined),
      agregarMarcaAgua: vi.fn(async () => undefined),
      changePage: vi.fn(),
      goToFirstPage: vi.fn(async () => undefined),
      goToLastPage: vi.fn(async () => undefined),
      zoomOutPdf: vi.fn(async () => undefined),
      resetPdfZoom: vi.fn(async () => undefined),
      zoomInPdf: vi.fn(async () => undefined),
      clearMarkers: vi.fn(),
      handleCanvasClick: vi.fn(async (_event: MouseEvent) => undefined),
      applySignatures: vi.fn(async () => undefined),
      generateSignaturePng: vi.fn(async (_options?: { silent?: boolean }) => undefined),
      downloadPreparedSignature: vi.fn(),
      usePreparedSignature: vi.fn(async () => undefined),
      removeSignature: vi.fn(),
    };

    registerWindowPdfActions(actions);

    expect(window.unirPDFs).toBe(actions.unirPDFs);
    expect(window.separarPDF).toBe(actions.separarPDF);
    expect(window.extraerPaginas).toBe(actions.extraerPaginas);
    expect(window.eliminarPaginas).toBe(actions.eliminarPaginas);
    expect(window.ordenarPaginasPdf).toBe(actions.ordenarPaginasPdf);
    expect(window.rotarPaginasPortrait).toBe(actions.rotarPaginasPortrait);
    expect(window.comprimirPDF).toBe(actions.comprimirPDF);
    expect(window.quitarClavePDF).toBe(actions.quitarClavePDF);
    expect(window.verMetadatosPDF).toBe(actions.verMetadatosPDF);
    expect(window.guardarMetadatosPDF).toBe(actions.guardarMetadatosPDF);
    expect(window.borrarMetadatosPDF).toBe(actions.borrarMetadatosPDF);
    expect(window.agregarMarcaAgua).toBe(actions.agregarMarcaAgua);
    expect(window.changePage).toBe(actions.changePage);
    expect(window.goToFirstPage).toBe(actions.goToFirstPage);
    expect(window.goToLastPage).toBe(actions.goToLastPage);
    expect(window.zoomOutPdf).toBe(actions.zoomOutPdf);
    expect(window.resetPdfZoom).toBe(actions.resetPdfZoom);
    expect(window.zoomInPdf).toBe(actions.zoomInPdf);
    expect(window.clearMarkers).toBe(actions.clearMarkers);
    expect(window.handleCanvasClick).toBe(actions.handleCanvasClick);
    expect(window.applySignatures).toBe(actions.applySignatures);
    expect(window.generateSignaturePng).toBe(actions.generateSignaturePng);
    expect(window.downloadPreparedSignature).toBe(actions.downloadPreparedSignature);
    expect(window.usePreparedSignature).toBe(actions.usePreparedSignature);
    expect(window.removeSignature).toBe(actions.removeSignature);
  });
});
