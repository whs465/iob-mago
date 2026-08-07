// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { watermarkPdfFlow } from './watermark-pdf-flow';

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
});
