// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { watermarkPdfBatchFlow, watermarkPdfFlow } from './watermark-pdf-flow';

const i18n = (_en: string, es: string) => es;

describe('watermarkPdfFlow', () => {
  it('rejects empty text before processing', async () => {
    const showStatus = vi.fn();
    const result = await watermarkPdfFlow({
      file: new File(['pdf'], 'a.pdf'), text: ' ', pagesText: '', opacity: 0.2, fontSize: 40, angle: 45,
      deps: {} as never, i18n, showStatus, setActionBusy: vi.fn(), saveAs: vi.fn(),
    });
    expect(result.status).toBe('missing-text');
    expect(showStatus).toHaveBeenCalledWith('Escribe el texto de la marca de agua', 'error');
  });

  it('adds a watermark to multiple PDFs and downloads a ZIP', async () => {
    class FakeZip {
      file = vi.fn();
      generateAsync = vi.fn(async () => new Blob(['zip']));
    }
    const saveAs = vi.fn();
    const result = await watermarkPdfBatchFlow({
      files: [new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')],
      text: 'CONFIDENCIAL', pagesText: '', opacity: 0.2, fontSize: 40, angle: 45,
      deps: { getPageCountFromArrayBuffer: vi.fn(async () => ({ pageCount: 1 })) } as never,
      i18n, showStatus: vi.fn(), setActionBusy: () => vi.fn(), saveAs, JSZipCtor: FakeZip,
      watermarkAction: vi.fn(async () => new Uint8Array([1])),
    });
    expect(result.status).toBe('batch-success');
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'pdfs-con-marca-de-agua.zip');
  });
});
