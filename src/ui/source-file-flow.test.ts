// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { setupSourceFileFlow } from './source-file-flow';
import type { SourceFileState } from '../state/source-files';
import type { PageOrderState } from '../state/page-order';

function createMockSourceFileState(initialFiles: File[] = []): SourceFileState {
  let files = [...initialFiles];
  let version = 0;

  return {
    get files() { return files; },
    get version() { return version; },
    setFiles: vi.fn((newFiles: File[]) => { files = [...newFiles]; version++; }) as unknown as SourceFileState['setFiles'],
    moveFile: vi.fn((from: number | null, to: number) => {
      if (from === null || from === to) return false;
      const arr = [...files];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      files = arr;
      version++;
      return true;
    }) as unknown as SourceFileState['moveFile'],
    removeFile: vi.fn((index: number) => {
      if (index < 0 || index >= files.length) return false;
      files = [...files.slice(0, index), ...files.slice(index + 1)];
      version++;
      return true;
    }) as unknown as SourceFileState['removeFile'],
    clear: vi.fn(() => { files = []; version++; }) as unknown as SourceFileState['clear'],
    beginAnalysis: vi.fn(() => { version++; return version; }) as unknown as SourceFileState['beginAnalysis'],
  };
}

function createMockPageOrderState(): PageOrderState {
  let pages: Array<{ originalIndex: number }> = [];
  let sourceVersion = -1;

  return {
    get pages() { return pages; },
    get sourceVersion() { return sourceVersion; },
    setPageCount: vi.fn((count: number, nextSourceVersion: number) => {
      pages = Array.from({ length: count }, (_, i) => ({ originalIndex: i }));
      sourceVersion = nextSourceVersion;
    }) as unknown as PageOrderState['setPageCount'],
    clear: vi.fn(() => { pages = []; sourceVersion = -1; }) as unknown as PageOrderState['clear'],
    movePage: vi.fn() as unknown as PageOrderState['movePage'],
    getOriginalIndexes: vi.fn(() => pages.map(p => p.originalIndex)) as unknown as PageOrderState['getOriginalIndexes'],
  };
}

describe('setupSourceFileFlow', () => {
  let pageOrderState: PageOrderState;
  let onOrderListUpdate: () => void;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="source-list"></div>
      <div id="source-workbench">
        <div id="source-workbench-status"></div>
        <p id="source-workbench-summary"></p>
      </div>
      <button id="source-clear-action"></button>
      <div id="rotate-status"></div>
      <div id="metadata-editor"></div>
      <input id="source-input" type="file" accept=".pdf" />
      <label id="source-label"></label>
    `;

    pageOrderState = createMockPageOrderState();
    onOrderListUpdate = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('returns an API with expected functions', () => {
    const sourceFileState = createMockSourceFileState();
    const api = setupSourceFileFlow({
      runtime: { sourceFileState, pageOrderState },
      deps: {
        getPdfPageCountFromArrayBuffer: vi.fn(),
        getPdfPageMetricsFromArrayBuffer: vi.fn(),
      },
      i18n: (en: string) => en,
      onOrderListUpdate,
    });

    expect(typeof api.actualizarSourceList).toBe('function');
    expect(typeof api.scheduleSourceAnalysis).toBe('function');
    expect(typeof api.actualizarRotateInfo).toBe('function');
  });

  it('loads selected PDF files from the shared source input', () => {
    const sourceFileState = createMockSourceFileState();
    setupSourceFileFlow({
      runtime: { sourceFileState, pageOrderState },
      deps: {
        getPdfPageCountFromArrayBuffer: vi.fn(),
        getPdfPageMetricsFromArrayBuffer: vi.fn(),
      },
      i18n: (en: string) => en,
      onOrderListUpdate,
    });

    const input = document.getElementById('source-input') as HTMLInputElement;
    const files = [
      new File(['a'], 'doc1.pdf', { type: 'application/pdf' }),
      new File(['b'], 'doc2.pdf', { type: 'application/pdf' }),
    ];
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: files,
    });

    input.dispatchEvent(new Event('change'));

    expect(sourceFileState.setFiles).toHaveBeenCalledWith(files);
    expect(sourceFileState.files).toEqual(files);
    expect(document.getElementById('source-list')?.children.length).toBe(2);
    expect(document.getElementById('source-workbench-status')?.textContent).toBe('Analysing PDF');
    expect((document.getElementById('source-clear-action') as HTMLButtonElement).disabled).toBe(false);
  });

  it('rejects non-PDF files without adding them to the shared source state', () => {
    const sourceFileState = createMockSourceFileState();
    setupSourceFileFlow({
      runtime: { sourceFileState, pageOrderState },
      deps: {
        getPdfPageCountFromArrayBuffer: vi.fn(),
        getPdfPageMetricsFromArrayBuffer: vi.fn(),
      },
      i18n: (en: string) => en,
      onOrderListUpdate,
    });

    const input = document.getElementById('source-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['image'], 'photo.png', { type: 'image/png' })],
    });
    input.dispatchEvent(new Event('change'));

    expect(sourceFileState.setFiles).not.toHaveBeenCalled();
    expect(document.getElementById('source-workbench-status')?.textContent).toBe('PDF files only');
    expect(document.getElementById('source-workbench-summary')?.textContent).toContain('.pdf');
  });

  it('clears selected PDF files from the workbench action', () => {
    const sourceFileState = createMockSourceFileState([
      new File(['a'], 'doc1.pdf', { type: 'application/pdf' }),
    ]);
    const api = setupSourceFileFlow({
      runtime: { sourceFileState, pageOrderState },
      deps: {
        getPdfPageCountFromArrayBuffer: vi.fn(),
        getPdfPageMetricsFromArrayBuffer: vi.fn(),
      },
      i18n: (en: string) => en,
      onOrderListUpdate,
    });

    api.actualizarSourceList();
    document.getElementById('source-clear-action')?.dispatchEvent(new Event('click'));

    expect(sourceFileState.clear).toHaveBeenCalledOnce();
    expect(sourceFileState.files).toEqual([]);
    expect(document.getElementById('source-list')?.children.length).toBe(0);
    expect(document.getElementById('source-workbench-status')?.textContent).toBe('No PDF loaded');
    expect((document.getElementById('source-clear-action') as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById('metadata-editor')?.hasAttribute('hidden')).toBe(true);
  });

  it('actualizarSourceList renders file items', () => {
    const sourceFileState = createMockSourceFileState([
      new File(['a'], 'doc1.pdf', { type: 'application/pdf' }),
      new File(['b'], 'doc2.pdf', { type: 'application/pdf' }),
    ]);
    const api = setupSourceFileFlow({
      runtime: { sourceFileState, pageOrderState },
      deps: {
        getPdfPageCountFromArrayBuffer: vi.fn(),
        getPdfPageMetricsFromArrayBuffer: vi.fn(),
      },
      i18n: (en: string) => en,
      onOrderListUpdate,
    });

    api.actualizarSourceList();

    const list = document.getElementById('source-list');
    expect(list?.children.length).toBe(2);
  });

  it('actualizarRotateInfo shows correct status message', () => {
    const sourceFileState = createMockSourceFileState([
      new File(['a'], 'doc.pdf', { type: 'application/pdf' }),
    ]);
    const api = setupSourceFileFlow({
      runtime: { sourceFileState, pageOrderState },
      deps: {
        getPdfPageCountFromArrayBuffer: vi.fn(),
        getPdfPageMetricsFromArrayBuffer: vi.fn(),
      },
      i18n: (en: string) => en,
      onOrderListUpdate,
    });

    api.actualizarRotateInfo();

    const el = document.getElementById('rotate-status');
    expect(el?.textContent).toBe('Drop PDF files above first');
  });

  it('stops the analyzing state when the loaded PDF requires a password', async () => {
    vi.useFakeTimers();
    const sourceFileState = createMockSourceFileState([
      new File(['protected'], 'locked.pdf', { type: 'application/pdf' }),
    ]);
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const api = setupSourceFileFlow({
      runtime: { sourceFileState, pageOrderState },
      deps: {
        getPdfPageCountFromArrayBuffer: vi.fn(async () => {
          throw Object.assign(new Error('Password required'), { name: 'PasswordException', code: 1 });
        }),
        getPdfPageMetricsFromArrayBuffer: vi.fn(),
      },
      i18n: (en: string) => en,
      onOrderListUpdate,
    });

    api.actualizarSourceList();
    await vi.advanceTimersByTimeAsync(210);

    expect(document.getElementById('source-workbench-status')?.textContent).toBe('Password-protected PDF');
    expect(document.getElementById('source-workbench-summary')?.textContent).toContain('Remove password');
    logError.mockRestore();
  });
});
