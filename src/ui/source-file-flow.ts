import type { SourceFileState } from '../state/source-files';
import type { PageOrderState } from '../state/page-order';
import type { SignatureMetaTranslator } from './signature-preview';
import { renderSourceFileList } from './source-list';
import { updateFileInputLabel } from './dom';
import { updateSourceToolStatuses } from './pdf-tools';

export type SourceFileFlowRuntime = {
  sourceFileState: SourceFileState;
  pageOrderState: PageOrderState;
};

export type SourceFileFlowDeps = {
  getPdfPageCountFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<{ pageCount: number }>;
  getPdfPageMetricsFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<{ metrics: Array<{ isLandscape: boolean }> }>;
};

export type SourceFileFlowOptions = {
  runtime: SourceFileFlowRuntime;
  deps: SourceFileFlowDeps;
  i18n: SignatureMetaTranslator;
  onOrderListUpdate(): void;
};

export type SourceFileFlowApi = {
  actualizarSourceList(): void;
  scheduleSourceAnalysis(): void;
  actualizarRotateInfo(): void;
};

export function setupSourceFileFlow({
  runtime,
  deps,
  i18n,
  onOrderListUpdate,
}: SourceFileFlowOptions): SourceFileFlowApi {
  const { sourceFileState, pageOrderState } = runtime;
  const { getPdfPageCountFromArrayBuffer, getPdfPageMetricsFromArrayBuffer } = deps;

  let rotateLandscapeCount = 0;
  let rotateTotalPages = 0;
  let rotateSourceVersion = -1;
  let sourceAnalysisTimer: ReturnType<typeof setTimeout> | null = null;

  function updateSourceWorkbench(state: 'empty' | 'analyzing' | 'ready' = 'empty') {
    const workbench = document.getElementById('source-workbench');
    const status = document.getElementById('source-workbench-status');
    const summary = document.getElementById('source-workbench-summary');
    const clearAction = document.getElementById('source-clear-action') as HTMLButtonElement | null;
    const fileCount = sourceFileState.files.length;

    if (workbench) {
      workbench.classList.toggle('has-files', fileCount > 0);
      workbench.classList.toggle('is-analyzing', state === 'analyzing');
    }
    if (clearAction) clearAction.disabled = fileCount === 0;

    if (!status || !summary) return;

    if (fileCount === 0) {
      status.textContent = i18n('No PDF loaded', 'Sin PDF cargado');
      summary.textContent = i18n(
        'Load one or more PDFs to activate the tools.',
        'Carga uno o varios PDFs para activar las herramientas.',
      );
      return;
    }

    if (state === 'analyzing') {
      status.textContent = i18n('Analyzing PDF', 'Analizando PDF');
    } else {
      status.textContent = i18n('Ready to work', 'Listo para trabajar');
    }

    const firstFile = sourceFileState.files[0];
    summary.textContent = i18n(
      '{{count}} file(s) loaded. First file: {{name}}',
      '{{count}} archivo(s) cargado(s). Primero: {{name}}',
      {
        count: String(fileCount),
        name: firstFile?.name || '',
      },
    );
  }

  function actualizarSourceList() {
    const list = document.getElementById('source-list');
    if (!list) return;

    // Metadata belongs to the current first file; never leave stale values visible
    // after the shared source list changes or is reordered.
    document.getElementById('metadata-editor')?.setAttribute('hidden', '');

    renderSourceFileList(list, sourceFileState.files, {
      moveUp: i18n('Move up', 'Subir'),
      moveDown: i18n('Move down', 'Bajar'),
      remove: i18n('Remove', 'Quitar'),
    }, {
      onMove: moverSourceFile,
      onRemove: removerSourceFile,
    });

    if (sourceFileState.files.length > 0) {
      updateFileInputLabel('source-label', 'source-input',
        i18n('{{count}} file(s) selected', '{{count}} archivo(s) seleccionado(s)', {
          count: String(sourceFileState.files.length),
        }),
        true,
      );
    } else {
      updateFileInputLabel('source-label', 'source-input',
        i18n('Select or drop your PDFs', 'Selecciona o arrastra tus PDFs'),
      );
    }

    actualizarCardEstados();
    if (sourceFileState.files.length > 0) {
      updateSourceWorkbench('analyzing');
      scheduleSourceAnalysis();
    } else {
      pageOrderState.clear();
      rotateLandscapeCount = 0;
      rotateTotalPages = 0;
      rotateSourceVersion = -1;
      updateSourceWorkbench('empty');
      onOrderListUpdate();
      actualizarRotateInfo();
    }
  }

  function moverSourceFile(fromIndex: number | null, toIndex: number) {
    if (sourceFileState.moveFile(fromIndex, toIndex)) actualizarSourceList();
  }

  function removerSourceFile(index: number) {
    if (sourceFileState.removeFile(index)) actualizarSourceList();
  }

  function limpiarSourceFiles() {
    sourceFileState.clear();
    actualizarSourceList();
  }

  function actualizarCardEstados() {
    const noFileMsg = i18n('Drop PDF files above first', 'Carga PDFs en la zona de arriba');
    updateSourceToolStatuses(sourceFileState.files, {
      noFile: noFileMsg,
      mergeLoaded: count => i18n(
        '{{count}} file(s) loaded — all will be merged',
        '{{count}} archivo(s) cargado(s) — todos se unirán',
        { count: String(count) },
      ),
    });
  }

  function scheduleSourceAnalysis() {
    if (sourceAnalysisTimer) clearTimeout(sourceAnalysisTimer);
    sourceAnalysisTimer = setTimeout(analizarSourceCards, 200);
  }

  async function analizarSourceCards() {
    sourceAnalysisTimer = null;
    if (sourceFileState.files.length === 0) return;

    const file = sourceFileState.files[0];
    const currentVersion = sourceFileState.beginAnalysis();

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (currentVersion !== sourceFileState.version) return;

      const { pageCount } = await getPdfPageCountFromArrayBuffer(arrayBuffer);
      if (currentVersion !== sourceFileState.version) return;

      pageOrderState.setPageCount(pageCount, sourceFileState.version);
      onOrderListUpdate();

      const { metrics } = await getPdfPageMetricsFromArrayBuffer(arrayBuffer);
      if (currentVersion !== sourceFileState.version) return;

      rotateTotalPages = metrics.length;
      rotateLandscapeCount = metrics.filter(m => m.isLandscape).length;
      rotateSourceVersion = sourceFileState.version;
      updateSourceWorkbench('ready');
      actualizarRotateInfo();
    } catch (error) {
      console.error(error);
    }
  }

  function actualizarRotateInfo() {
    const el = document.getElementById('rotate-status');
    if (!el) return;
    if (sourceFileState.files.length === 0 || rotateSourceVersion !== sourceFileState.version) {
      el.textContent = i18n('Drop PDF files above first', 'Carga PDFs en la zona de arriba');
      return;
    }
    if (rotateTotalPages === 0) {
      el.textContent = i18n('Analyzing...', 'Analizando...');
      return;
    }
    el.textContent = i18n(
      '{{name}} — {{landscape}} of {{total}} landscape',
      '{{name}} — {{landscape}} de {{total}} horizontales',
      {
        name: sourceFileState.files[0].name,
        landscape: String(rotateLandscapeCount),
        total: String(rotateTotalPages),
      },
    );
  }

  const sourceInput = document.getElementById('source-input') as HTMLInputElement | null;
  sourceInput?.addEventListener('click', function() {
    this.value = '';
  });
  sourceInput?.addEventListener('change', event => {
    const selectedFiles = Array.from((event.target as HTMLInputElement).files || []);
    sourceFileState.setFiles(selectedFiles);
    actualizarSourceList();
  });
  document.getElementById('source-clear-action')?.addEventListener('click', limpiarSourceFiles);

  updateSourceWorkbench('empty');
  actualizarCardEstados();
  actualizarRotateInfo();

  return {
    actualizarSourceList,
    scheduleSourceAnalysis,
    actualizarRotateInfo,
  };
}
