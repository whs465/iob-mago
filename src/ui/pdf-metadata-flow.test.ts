// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPdfMetadataFlow, readMetadataForm, renderMetadataForm } from './pdf-metadata-flow';

describe('metadata form helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="metadata-editor" hidden></div><span id="metadata-dates"></span>
      <input id="metadata-title"><input id="metadata-author"><input id="metadata-subject">
      <input id="metadata-keywords"><input id="metadata-creator"><input id="metadata-producer">`;
  });

  it('renders and reads editable metadata', () => {
    renderMetadataForm({ title: 'Report', author: 'Ana', subject: 'S', keywords: 'one', creator: 'App', producer: 'PDF' }, 'en');
    expect(readMetadataForm()).toEqual({ title: 'Report', author: 'Ana', subject: 'S', keywords: 'one', creator: 'App', producer: 'PDF' });
    expect(document.getElementById('metadata-editor')?.hasAttribute('hidden')).toBe(false);
  });

  it('does not render metadata when the source file changed while reading', async () => {
    const file = new File(['pdf'], 'old.pdf', { type: 'application/pdf' });
    let resolveDocument!: (value: never) => void;
    const loadPdfDocument = vi.fn(() => new Promise<never>(resolve => { resolveDocument = resolve; }));
    let currentFile: File | null = file;
    const finish = vi.fn();

    const pending = loadPdfMetadataFlow({
      file,
      isCurrentFile: candidate => candidate === currentFile,
      deps: { loadPdfDocument },
      i18n: (english: string) => english,
      showStatus: vi.fn(),
      setActionBusy: vi.fn(() => finish),
    });

    await vi.waitFor(() => expect(loadPdfDocument).toHaveBeenCalledOnce());
    currentFile = null;
    resolveDocument({
      getTitle: () => 'Old title', getAuthor: () => undefined, getSubject: () => undefined,
      getKeywords: () => undefined, getCreator: () => undefined, getProducer: () => undefined,
      getCreationDate: () => undefined, getModificationDate: () => undefined,
    } as never);

    await expect(pending).resolves.toEqual({ status: 'stale' });
    expect(document.getElementById('metadata-editor')?.hasAttribute('hidden')).toBe(true);
    expect(finish).toHaveBeenCalledOnce();
  });
});
