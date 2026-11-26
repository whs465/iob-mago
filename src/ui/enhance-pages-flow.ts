import type * as PdfJs from 'pdfjs-dist';
import { adjustPagePixels, enhancePdfPages, NEUTRAL_PAGE_TONE, renderEnhancementPage, type PageTone } from '../pdf/enhance-pages';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import { getRequiredElement } from './dom';
import type { SignatureMetaTranslator } from './signature-preview';

type EnhancePagesOptions = {
  pdfjs: Pick<typeof PdfJs, 'getDocument' | 'AnnotationMode'>;
  i18n: SignatureMetaTranslator;
  saveAs(blob: Blob, filename: string): void;
};

function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) blob.arrayBuffer().then(resolve, reject);
      else reject(new Error('Could not encode page'));
    }, 'image/png');
  });
}

export function setupEnhancePagesFlow({ pdfjs, i18n, saveAs }: EnhancePagesOptions) {
  const open = getRequiredElement<HTMLButtonElement>('enhance-open');
  const editor = getRequiredElement('enhance-editor');
  const preview = getRequiredElement<HTMLCanvasElement>('enhance-preview');
  const pageSelect = getRequiredElement<HTMLSelectElement>('enhance-page');
  const contrast = getRequiredElement<HTMLInputElement>('enhance-contrast');
  const brightness = getRequiredElement<HTMLInputElement>('enhance-brightness');
  const original = getRequiredElement<HTMLInputElement>('enhance-original');
  const reset = getRequiredElement<HTMLButtonElement>('enhance-reset');
  const download = getRequiredElement<HTMLButtonElement>('enhance-download');
  const status = getRequiredElement('enhance-status');
  const count = getRequiredElement('enhance-count');
  const toneControls = getRequiredElement<HTMLFieldSetElement>('enhance-tone-controls');
  const adjustments = new Map<number, PageTone>();
  let file: File | undefined;
  let loading: ReturnType<typeof PdfJs.getDocument> | undefined;
  let pdf: PdfJs.PDFDocumentProxy | undefined;
  let task: ReturnType<typeof renderEnhancementPage> | undefined;
  let pixels: ImageData | undefined;
  let adjustedPixels: ImageData | undefined;
  let frame: number | undefined;
  let sourceVersion = 0;
  let previewVersion = 0;
  let busy = false;

  const say = (english: string, spanish: string) => { status.textContent = i18n(english, spanish); };

  function updateControls() {
    const page = Number(pageSelect.value);
    const tone = adjustments.get(page) ?? NEUTRAL_PAGE_TONE;
    contrast.value = String(tone.contrast);
    brightness.value = String(tone.brightness);
    getRequiredElement('enhance-contrast-value').textContent = `${tone.contrast}%`;
    getRequiredElement('enhance-brightness-value').textContent = `${tone.brightness}%`;
    pageSelect.disabled = busy;
    toneControls.disabled = busy || !pixels;
    reset.disabled = !adjustments.has(page);
    download.disabled = busy || !adjustments.size;
    count.textContent = i18n(
      'Adjusted pages: {{count}}', 'Páginas ajustadas: {{count}}', { count: String(adjustments.size) },
    );
  }

  function paint() {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (!pixels || !adjustedPixels) return;
      const context = preview.getContext('2d');
      const tone = adjustments.get(Number(pageSelect.value));
      if (!tone || original.checked) {
        context?.putImageData(pixels, 0, 0);
      } else {
        adjustPagePixels(pixels.data, adjustedPixels.data, tone);
        context?.putImageData(adjustedPixels, 0, 0);
      }
      preview.hidden = false;
    });
  }

  async function showPage() {
    const version = ++previewVersion;
    task?.cancel();
    pixels = undefined;
    preview.hidden = true;
    original.checked = false;
    updateControls();
    say('Preparing preview…', 'Preparando vista previa…');
    try {
      const page = await pdf!.getPage(Number(pageSelect.value));
      if (version !== previewVersion) return;
      const canvas = document.createElement('canvas');
      task = renderEnhancementPage(page, canvas, 1100, pdfjs.AnnotationMode.DISABLE);
      await task.promise;
      if (version !== previewVersion) return;
      preview.width = canvas.width;
      preview.height = canvas.height;
      const context = canvas.getContext('2d')!;
      pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      adjustedPixels = context.createImageData(canvas.width, canvas.height);
      status.textContent = '';
      updateControls();
      paint();
    } catch {
      if (version === previewVersion) say('Could not show this page.', 'No se pudo mostrar esta página.');
    }
  }

  function setFile(nextFile: File | undefined) {
    if (file === nextFile) return;
    file = nextFile;
    sourceVersion++;
    previewVersion++;
    task?.cancel();
    if (loading) void loading.destroy().catch(() => {});
    loading = undefined;
    pdf = undefined;
    pixels = undefined;
    adjustedPixels = undefined;
    busy = false;
    adjustments.clear();
    editor.hidden = true;
    preview.hidden = true;
    open.hidden = false;
    open.disabled = !file;
    status.textContent = file?.name ?? '';
  }

  open.addEventListener('click', async () => {
    if (!file || open.disabled) return;
    const version = sourceVersion;
    open.disabled = true;
    say('Opening PDF…', 'Abriendo PDF…');
    try {
      const bytes = await file.arrayBuffer();
      if (version !== sourceVersion) return;
      loading = pdfjs.getDocument({ data: bytes, stopAtErrors: true });
      const documentPdf = await loading.promise;
      if (version !== sourceVersion) return;
      pdf = documentPdf;
      const options = document.createDocumentFragment();
      for (let page = 1; page <= pdf.numPages; page++) {
        options.append(new Option(i18n('Page {{page}}', 'Página {{page}}', { page: String(page) }), String(page)));
      }
      pageSelect.replaceChildren(options);
      editor.hidden = false;
      open.hidden = true;
      await showPage();
    } catch {
      if (version !== sourceVersion) return;
      if (loading) void loading.destroy().catch(() => {});
      loading = undefined;
      open.disabled = false;
      say('Could not open the PDF. Check whether it is password-protected.', 'No se pudo abrir el PDF. Revisa si está protegido con contraseña.');
    }
  });

  pageSelect.addEventListener('change', () => { void showPage(); });
  const setTone = (tone: PageTone) => {
    const page = Number(pageSelect.value);
    if (tone.contrast === NEUTRAL_PAGE_TONE.contrast && tone.brightness === NEUTRAL_PAGE_TONE.brightness) {
      adjustments.delete(page);
    } else {
      adjustments.set(page, tone);
    }
    original.checked = false;
    updateControls();
    paint();
  };
  for (const input of [contrast, brightness]) {
    input.addEventListener('input', () => setTone({ contrast: contrast.valueAsNumber, brightness: brightness.valueAsNumber }));
  }
  original.addEventListener('change', paint);
  reset.addEventListener('click', () => setTone(NEUTRAL_PAGE_TONE));

  download.addEventListener('click', async () => {
    if (!file || !pdf || download.disabled) return;
    const version = sourceVersion;
    const documentPdf = pdf;
    const filename = getPdfBaseName(file.name) + i18n('-enhanced.pdf', '-mejorado.pdf');
    busy = true;
    updateControls();
    say('Preparing adjusted pages…', 'Preparando páginas ajustadas…');
    try {
      const bytes = await enhancePdfPages(await file.arrayBuffer(), new Map(adjustments), async (number, tone) => {
        const page = await documentPdf.getPage(number);
        const canvas = document.createElement('canvas');
        await renderEnhancementPage(page, canvas, 2800, pdfjs.AnnotationMode.DISABLE, 0).promise;
        const context = canvas.getContext('2d')!;
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        adjustPagePixels(image.data, image.data, tone);
        context.putImageData(image, 0, 0);
        return { png: await canvasPng(canvas), view: page.view };
      });
      if (version !== sourceVersion) return;
      saveAs(pdfBytesToBlob(bytes), filename);
      say('Enhanced PDF downloaded.', 'PDF mejorado descargado.');
    } catch {
      if (version === sourceVersion) say('Could not create the enhanced PDF.', 'No se pudo crear el PDF mejorado.');
    } finally {
      if (version === sourceVersion) {
        busy = false;
        updateControls();
      }
    }
  });

  return { setFile };
}
