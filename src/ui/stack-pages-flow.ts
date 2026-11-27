import type * as PdfJs from 'pdfjs-dist';
import { renderEnhancementPage } from '../pdf/enhance-pages';
import { buildStackedPdf, getInkBounds, getStackLayout, STACK_SHEET_SIZE, type StackRect } from '../pdf/stack-pages';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import { getRequiredElement } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

type StackPagesOptions = {
  pdfjs: Pick<typeof PdfJs, 'getDocument' | 'AnnotationMode'>;
  i18n: SignatureMetaTranslator;
  saveAs(blob: Blob, filename: string): void;
};

type RenderedPage = { canvas: HTMLCanvasElement; bounds: StackRect; width: number; height: number };
type Placement = { canvas: HTMLCanvasElement; crop: StackRect; placement: StackRect };

function toCroppedPng({ canvas, crop }: Placement) {
  const cropped = document.createElement('canvas');
  cropped.width = crop.width;
  cropped.height = crop.height;
  const context = cropped.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise<ArrayBuffer>((resolve, reject) => {
    cropped.toBlob(blob => {
      if (blob) blob.arrayBuffer().then(resolve, reject);
      else reject(new Error('Could not encode page'));
    }, 'image/png');
  });
}

export function setupStackPagesFlow({ pdfjs, i18n, saveAs }: StackPagesOptions) {
  const open = getRequiredElement<HTMLButtonElement>('stack-open');
  const editor = getRequiredElement('stack-editor');
  const top = getRequiredElement<HTMLSelectElement>('stack-top');
  const bottom = getRequiredElement<HTMLSelectElement>('stack-bottom');
  const trim = getRequiredElement<HTMLInputElement>('stack-trim');
  const swap = getRequiredElement<HTMLButtonElement>('stack-swap');
  const preview = getRequiredElement<HTMLCanvasElement>('stack-preview');
  const download = getRequiredElement<HTMLButtonElement>('stack-download');
  const status = getRequiredElement('stack-status');

  let file: File | undefined;
  let loading: ReturnType<typeof PdfJs.getDocument> | undefined;
  let pdf: PdfJs.PDFDocumentProxy | undefined;
  let task: ReturnType<typeof renderEnhancementPage> | undefined;
  let ready: [Placement, Placement] | undefined;
  let sourceVersion = 0;
  let previewVersion = 0;
  const cache = new Map<number, RenderedPage>();
  const say = (english: string, spanish: string) => { status.textContent = i18n(english, spanish); };

  async function updatePreview() {
    const version = ++previewVersion;
    task?.cancel();
    task = undefined;
    ready = undefined;
    download.disabled = true;
    preview.hidden = true;
    const selected = [Number(top.value), Number(bottom.value)] as const;
    if (selected[0] === selected[1]) {
      say('Choose two different pages.', 'Elige dos páginas distintas.');
      return;
    }
    for (const number of cache.keys()) {
      if (!selected.includes(number)) cache.delete(number);
    }
    say('Preparing preview…', 'Preparando vista previa…');

    try {
      const inputs: Array<{ canvas: HTMLCanvasElement; crop: StackRect; width: number; height: number }> = [];
      for (const number of selected) {
        let image = cache.get(number);
        if (!image) {
          const page = await pdf!.getPage(number);
          if (version !== previewVersion) return;
          const canvas = document.createElement('canvas');
          task = renderEnhancementPage(page, canvas, 2300, pdfjs.AnnotationMode.ENABLE);
          await task.promise;
          if (version !== previewVersion) return;
          task = undefined;
          const context = canvas.getContext('2d')!;
          const bounds = getInkBounds(context.getImageData(0, 0, canvas.width, canvas.height));
          const { width, height } = page.getViewport({ scale: 1 });
          image = { canvas, bounds, width, height };
          cache.set(number, image);
        }
        const { canvas, bounds, width, height } = image;
        const crop = trim.checked ? bounds : { x: 0, y: 0, width: canvas.width, height: canvas.height };
        inputs.push({ canvas, crop, width: width * crop.width / canvas.width, height: height * crop.height / canvas.height });
      }
      const [first, second] = inputs;
      const [firstRect, secondRect] = getStackLayout([first, second]);
      ready = [{ ...first, placement: firstRect }, { ...second, placement: secondRect }];
      const [width, height] = STACK_SHEET_SIZE;
      preview.width = Math.round(width);
      preview.height = Math.round(height);
      const context = preview.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, preview.width, preview.height);
      for (const { canvas, crop, placement } of ready) {
        context.drawImage(canvas, crop.x, crop.y, crop.width, crop.height,
          placement.x, placement.y, placement.width, placement.height);
      }
      preview.hidden = false;
      download.disabled = false;
      status.textContent = '';
    } catch {
      if (version === previewVersion) say('Could not prepare those pages.', 'No se pudieron preparar esas páginas.');
    }
  }

  function setFile(next: File | undefined) {
    if (file === next) return;
    file = next;
    sourceVersion++;
    previewVersion++;
    task?.cancel();
    task = undefined;
    if (loading) void loading.destroy().catch(() => {});
    loading = undefined;
    pdf = undefined;
    ready = undefined;
    cache.clear();
    editor.hidden = true;
    preview.hidden = true;
    open.hidden = false;
    open.disabled = !file;
    download.disabled = true;
    status.textContent = file?.name ?? '';
  }

  open.addEventListener('click', async () => {
    if (!file || open.disabled) return;
    const version = sourceVersion;
    open.disabled = true;
    say('Opening PDF…', 'Abriendo PDF…');
    try {
      const data = await file.arrayBuffer();
      if (version !== sourceVersion) return;
      loading = pdfjs.getDocument({ data });
      const loaded = await loading.promise;
      if (version !== sourceVersion) return;
      if (loaded.numPages < 2) {
        await loading.destroy();
        if (version !== sourceVersion) return;
        loading = undefined;
        say('Choose a PDF with at least two pages.', 'Elige un PDF de al menos dos páginas.');
        return;
      }
      pdf = loaded;
      const options = Array.from({ length: pdf.numPages }, (_, index) => {
        const page = String(index + 1);
        return new Option(i18n('Page {{page}}', 'Página {{page}}', { page }), page);
      });
      top.replaceChildren(...options);
      bottom.replaceChildren(...options.map(option => option.cloneNode(true)));
      top.value = '1';
      bottom.value = '2';
      editor.hidden = false;
      open.hidden = true;
      await updatePreview();
    } catch {
      if (version !== sourceVersion) return;
      if (loading) void loading.destroy().catch(() => {});
      loading = undefined;
      open.disabled = false;
      say('Could not open the PDF.', 'No se pudo abrir el PDF.');
    }
  });

  for (const control of [top, bottom, trim]) control.addEventListener('change', () => { void updatePreview(); });
  swap.addEventListener('click', () => {
    [top.value, bottom.value] = [bottom.value, top.value];
    void updatePreview();
  });
  download.addEventListener('click', async () => {
    if (!ready || !file || download.disabled) return;
    const version = previewVersion;
    const [first, second] = ready;
    const baseName = getPdfBaseName(file.name);
    download.disabled = true;
    try {
      const [firstPng, secondPng] = await Promise.all([toCroppedPng(first), toCroppedPng(second)]);
      const bytes = await buildStackedPdf([
        { png: firstPng, placement: first.placement },
        { png: secondPng, placement: second.placement },
      ]);
      if (version !== previewVersion) return;
      saveAs(pdfBytesToBlob(bytes), baseName + i18n('-two-in-one.pdf', '-dos-en-una.pdf'));
      say('PDF downloaded.', 'PDF descargado.');
    } catch {
      if (version === previewVersion) say('Could not create the PDF.', 'No se pudo crear el PDF.');
    } finally {
      if (version === previewVersion) download.disabled = false;
    }
  });

  return { setFile };
}
