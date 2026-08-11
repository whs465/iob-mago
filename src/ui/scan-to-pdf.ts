import type { SignatureMetaTranslator } from './signature-preview';
import { scannedImagesToPdf, type ScanPdfDeps, type ScanPageFormat, type ScannedImagePage } from '../pdf/scan-images';
import { pdfBytesToBlob } from '../utils/pdf-bytes';

type ScanFinish = 'original' | 'document' | 'grayscale';
type DrawableImage = CanvasImageSource & { width: number; height: number };

type ScanSourcePage = {
  id: string;
  file: File;
  previewUrl: string;
  rotation: 0 | 90 | 180 | 270;
};

export type ScanToPdfOptions = {
  root?: ParentNode;
  i18n: SignatureMetaTranslator;
  saveAs(blob: Blob, filename: string): void;
  deps: ScanPdfDeps;
  decodeImage?: (file: Blob) => Promise<DrawableImage>;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  buildPdf?: typeof scannedImagesToPdf;
};

const MAX_SCAN_EDGE = 2400;

export function getRotatedImageSize(width: number, height: number, rotation: number) {
  return rotation % 180 === 0
    ? { width, height }
    : { width: height, height: width };
}

function decodeImageFile(file: Blob) {
  return new Promise<DrawableImage>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image'));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare the scanned page'));
    }, 'image/jpeg', 0.88);
  });
}

export function drawScannedImage(
  canvas: HTMLCanvasElement,
  image: DrawableImage,
  rotation: 0 | 90 | 180 | 270,
  finish: ScanFinish,
) {
  const rotated = getRotatedImageSize(image.width, image.height, rotation);
  const scale = Math.min(1, MAX_SCAN_EDGE / Math.max(rotated.width, rotated.height));
  canvas.width = Math.max(1, Math.round(rotated.width * scale));
  canvas.height = Math.max(1, Math.round(rotated.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotation * Math.PI / 180);
  context.filter = finish === 'document'
    ? 'grayscale(0.18) contrast(1.16) brightness(1.04)'
    : finish === 'grayscale'
      ? 'grayscale(1) contrast(1.3) brightness(1.06)'
      : 'none';
  const sourceScale = Math.min(
    canvas.width / (rotation % 180 === 0 ? image.width : image.height),
    canvas.height / (rotation % 180 === 0 ? image.height : image.width),
  );
  context.drawImage(
    image,
    -image.width * sourceScale / 2,
    -image.height * sourceScale / 2,
    image.width * sourceScale,
    image.height * sourceScale,
  );
  context.restore();
  return { width: canvas.width, height: canvas.height };
}

function scanFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `escaneo-${date}.pdf`;
}

export function setupScanToPdf({
  root = document,
  i18n,
  saveAs,
  deps,
  decodeImage = decodeImageFile,
  createObjectUrl = blob => URL.createObjectURL(blob),
  revokeObjectUrl = url => URL.revokeObjectURL(url),
  buildPdf = scannedImagesToPdf,
}: ScanToPdfOptions) {
  const panel = root.querySelector<HTMLElement>('#scan-tool-panel');
  const zone = root.querySelector<HTMLElement>('#scan-drop-zone');
  const input = root.querySelector<HTMLInputElement>('#scan-image-input');
  const camera = root.querySelector<HTMLInputElement>('#scan-camera-input');
  const list = root.querySelector<HTMLElement>('#scan-page-list');
  const empty = root.querySelector<HTMLElement>('#scan-empty');
  const status = root.querySelector<HTMLElement>('#scan-status');
  const finish = root.querySelector<HTMLSelectElement>('#scan-finish');
  const format = root.querySelector<HTMLSelectElement>('#scan-page-format');
  const margin = root.querySelector<HTMLSelectElement>('#scan-margin');
  const action = root.querySelector<HTMLButtonElement>('#scan-download-action');
  const clear = root.querySelector<HTMLButtonElement>('#scan-clear-action');
  const toolButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-image-tool]'));
  const toolPanels = Array.from(root.querySelectorAll<HTMLElement>('[data-image-tool-panel]'));
  if (!panel || !zone || !input || !camera || !list || !empty || !status || !finish || !format || !margin || !action || !clear) {
    return () => undefined;
  }

  let pages: ScanSourcePage[] = [];
  const cleanups: Array<() => void> = [];

  const setTool = (tool: string) => {
    const tabs = root.querySelector<HTMLElement>('.image-tool-tabs');
    if (tabs) tabs.dataset.activeImageTool = tool;
    toolButtons.forEach(button => {
      const active = button.dataset.imageTool === tool;
      button.classList.toggle('image-tool-tab-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    toolPanels.forEach(toolPanel => { toolPanel.hidden = toolPanel.dataset.imageToolPanel !== tool; });
  };
  toolButtons.forEach(button => {
    const onClick = () => setTool(button.dataset.imageTool || 'screenshot');
    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  });

  const updateState = () => {
    const hasPages = pages.length > 0;
    empty.hidden = hasPages;
    list.hidden = !hasPages;
    action.disabled = !hasPages;
    clear.disabled = !hasPages;
    [finish, format, margin].forEach(control => { control.disabled = !hasPages; });
    status.textContent = hasPages
      ? i18n(
        '{{count}} page(s) ready · drag more images here to add them',
        '{{count}} página(s) lista(s) · arrastra más imágenes para agregarlas',
        { count: String(pages.length) },
      )
      : i18n('Waiting for images · processed locally', 'Esperando imágenes · se procesan localmente');
  };

  const renderPages = () => {
    list.innerHTML = '';
    pages.forEach((page, index) => {
      const item = document.createElement('article');
      item.className = 'scan-page-item';
      item.dataset.scanPageId = page.id;

      const preview = document.createElement('div');
      preview.className = 'scan-page-preview';
      const image = document.createElement('img');
      image.src = page.previewUrl;
      image.alt = '';
      image.style.transform = `rotate(${page.rotation}deg)`;
      preview.appendChild(image);

      const copy = document.createElement('div');
      copy.className = 'scan-page-copy';
      const number = document.createElement('strong');
      number.textContent = i18n('Page {{page}}', 'Página {{page}}', { page: String(index + 1) });
      const name = document.createElement('span');
      name.textContent = page.file.name;
      name.title = page.file.name;
      copy.append(number, name);

      const controls = document.createElement('div');
      controls.className = 'scan-page-actions';
      const actions = [
        ['up', '↑', i18n('Move up', 'Subir')],
        ['down', '↓', i18n('Move down', 'Bajar')],
        ['rotate', '↻', i18n('Rotate', 'Girar')],
        ['remove', '×', i18n('Remove', 'Quitar')],
      ];
      actions.forEach(([actionName, label, title]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.scanAction = actionName;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.textContent = label;
        if (actionName === 'up') button.disabled = index === 0;
        if (actionName === 'down') button.disabled = index === pages.length - 1;
        controls.appendChild(button);
      });
      item.append(preview, copy, controls);
      list.appendChild(item);
    });
    updateState();
  };

  const addFiles = (files: File[]) => {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (!images.length) {
      status.textContent = i18n('Choose image files', 'Elige archivos de imagen');
      return;
    }
    pages = [...pages, ...images.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: createObjectUrl(file),
      rotation: 0 as const,
    }))];
    zone.classList.add('has-pages');
    renderPages();
  };

  const onInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    addFiles(Array.from(target.files || []));
    target.value = '';
  };
  input.addEventListener('change', onInput);
  camera.addEventListener('change', onInput);
  cleanups.push(() => input.removeEventListener('change', onInput));
  cleanups.push(() => camera.removeEventListener('change', onInput));

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    zone.classList.add('is-dragging');
  };
  const onDragLeave = () => zone.classList.remove('is-dragging');
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    zone.classList.remove('is-dragging');
    addFiles(Array.from(event.dataTransfer?.files || []));
  };
  zone.addEventListener('dragover', onDragOver);
  zone.addEventListener('dragleave', onDragLeave);
  zone.addEventListener('drop', onDrop);
  cleanups.push(() => zone.removeEventListener('dragover', onDragOver));
  cleanups.push(() => zone.removeEventListener('dragleave', onDragLeave));
  cleanups.push(() => zone.removeEventListener('drop', onDrop));

  const onListClick = (event: Event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-scan-action]');
    const item = button?.closest<HTMLElement>('[data-scan-page-id]');
    if (!button || !item) return;
    const index = pages.findIndex(page => page.id === item.dataset.scanPageId);
    if (index < 0) return;
    const actionName = button.dataset.scanAction;
    if (actionName === 'remove') {
      revokeObjectUrl(pages[index].previewUrl);
      pages = pages.filter((_, pageIndex) => pageIndex !== index);
    } else if (actionName === 'rotate') {
      const page = pages[index];
      pages = pages.map((candidate, pageIndex) => pageIndex === index
        ? { ...page, rotation: ((page.rotation + 90) % 360) as ScanSourcePage['rotation'] }
        : candidate);
    } else if (actionName === 'up' && index > 0) {
      [pages[index - 1], pages[index]] = [pages[index], pages[index - 1]];
    } else if (actionName === 'down' && index < pages.length - 1) {
      [pages[index], pages[index + 1]] = [pages[index + 1], pages[index]];
    }
    renderPages();
  };
  list.addEventListener('click', onListClick);
  cleanups.push(() => list.removeEventListener('click', onListClick));

  const clearPages = () => {
    pages.forEach(page => revokeObjectUrl(page.previewUrl));
    pages = [];
    zone.classList.remove('has-pages');
    renderPages();
  };
  clear.addEventListener('click', clearPages);
  cleanups.push(() => clear.removeEventListener('click', clearPages));

  const preparePage = async (page: ScanSourcePage): Promise<ScannedImagePage> => {
    const image = await decodeImage(page.file);
    const canvas = document.createElement('canvas');
    const size = drawScannedImage(canvas, image, page.rotation, finish.value as ScanFinish);
    const blob = await canvasToJpeg(canvas);
    return { bytes: await blob.arrayBuffer(), type: 'image/jpeg', ...size };
  };

  const onDownload = async () => {
    if (!pages.length || action.disabled) return;
    action.disabled = true;
    action.setAttribute('aria-busy', 'true');
    status.textContent = i18n('Preparing scanned pages...', 'Preparando páginas escaneadas...');
    try {
      const prepared: ScannedImagePage[] = [];
      for (let index = 0; index < pages.length; index += 1) {
        status.textContent = i18n(
          'Preparing page {{page}} of {{total}}...',
          'Preparando página {{page}} de {{total}}...',
          { page: String(index + 1), total: String(pages.length) },
        );
        prepared.push(await preparePage(pages[index]));
      }
      const bytes = await buildPdf(prepared, {
        format: format.value as ScanPageFormat,
        margin: Number(margin.value) || 0,
      }, deps);
      saveAs(pdfBytesToBlob(bytes), scanFilename());
      status.textContent = i18n('Scanned PDF downloaded', 'PDF escaneado descargado');
    } catch (error) {
      console.error(error);
      status.textContent = i18n('The scanned PDF could not be created', 'No se pudo crear el PDF escaneado');
    } finally {
      action.removeAttribute('aria-busy');
      action.disabled = pages.length === 0;
    }
  };
  action.addEventListener('click', onDownload);
  cleanups.push(() => action.removeEventListener('click', onDownload));

  updateState();
  setTool('screenshot');
  return () => {
    cleanups.forEach(cleanup => cleanup());
    pages.forEach(page => revokeObjectUrl(page.previewUrl));
  };
}
