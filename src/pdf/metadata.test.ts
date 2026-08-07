import { describe, expect, it, vi } from 'vitest';
import { emptyPdfMetadata, getPdfMetadata, writePdfMetadata } from './metadata';

function makePdf(overrides = {}) {
  return {
    getTitle: () => 'Report', getAuthor: () => 'Ana', getSubject: () => undefined,
    getKeywords: () => 'one two', getCreator: () => 'Writer', getProducer: () => 'Engine',
    getCreationDate: () => new Date('2024-01-01T00:00:00Z'), getModificationDate: () => undefined,
    setTitle: vi.fn(), setAuthor: vi.fn(), setSubject: vi.fn(), setKeywords: vi.fn(),
    setCreator: vi.fn(), setProducer: vi.fn(), save: vi.fn(async () => new Uint8Array([1, 2])),
    ...overrides,
  };
}

describe('PDF metadata', () => {
  it('reads available fields without changing the document', async () => {
    const pdf = makePdf();
    const metadata = await getPdfMetadata(new File(['pdf'], 'a.pdf'), {
      loadPdfDocument: vi.fn(async () => pdf),
    });
    expect(metadata).toMatchObject({ title: 'Report', author: 'Ana', subject: '', modificationDate: null });
  });

  it('writes trimmed fields and parses keywords', async () => {
    const pdf = makePdf();
    await writePdfMetadata(new File(['pdf'], 'a.pdf'), {
      title: ' New title ', author: ' Ana ', subject: '', keywords: 'one, two; three', creator: '', producer: '',
    }, { loadPdfDocument: vi.fn(async () => pdf) });
    expect(pdf.setTitle).toHaveBeenCalledWith('New title');
    expect(pdf.setKeywords).toHaveBeenCalledWith(['one', 'two', 'three']);
  });

  it('provides a complete empty editable value for clearing metadata', () => {
    expect(emptyPdfMetadata()).toEqual({ title: '', author: '', subject: '', keywords: '', creator: '', producer: '' });
  });
});
