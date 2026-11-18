import type { SignatureMetaTranslator } from './signature-preview';
import { scannedImagesToPdf, type ScanPdfDeps, type ScanPageFormat, type ScannedImagePage } from '../pdf/scan-images';
import { pdfBytesToBlob } from '../utils/pdf-bytes';
import {
  cloneScanCrop,
  EDITOR_SCAN_CROP,
  FULL_SCAN_CROP,
  getScanCropOutputSize,
  warpScanCrop,
  type ScanCrop,
} from '../utils/scan-crop';

type ScanFinish = 'original' | 'document' | 'grayscale' | 'black-white';
type ScanTone = { contrast: number; brightness: number; threshold: number };
type DrawableImage = CanvasImageSource & { width: number; height: number };

type ScanSourcePage = {
  id: string;
  file: File;
  previewUrl: string;
  rotation: 0 | 90 | 180 | 270;
  crop: ScanCrop | null;
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
const DEFAULT_SCAN_TONE: ScanTone = { contrast: 100, brightness: 0, threshold: 150 };

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
  tone = DEFAULT_SCAN_TONE,
  maxEdge = MAX_SCAN_EDGE,
) {
  const rotated = getRotatedImageSize(image.width, image.height, rotation);
  const scale = Math.min(1, maxEdge / Math.max(rotated.width, rotated.height));
  const width = Math.max(1, Math.round(rotated.width * scale));
  const height = Math.max(1, Math.round(rotated.height * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotation * Math.PI / 180);
  context.filter = finish === 'document'
    ? 'grayscale(0.3) contrast(1.28) brightness(1.07)'
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
  applyScanTone(canvas, context, finish, tone);
  return { width: canvas.width, height: canvas.height };
}

function applyScanTone(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, finish: ScanFinish, tone: ScanTone) {
  if (finish !== 'grayscale' && finish !== 'black-white') return;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const contrast = tone.contrast / 100;
  const brightness = tone.brightness * 255 / 100;
  for (let offset = 0; offset < data.length; offset += 4) {
    const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    const value = finish === 'black-white'
      ? (Math.round(luminance) >= tone.threshold ? 255 : 0)
      : (luminance - 128) * contrast + 128 + brightness;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
  }
  context.putImageData(imageData, 0, 0);
}

export function drawCroppedScannedImage(
  canvas: HTMLCanvasElement,
  image: DrawableImage,
  rotation: 0 | 90 | 180 | 270,
  finish: ScanFinish,
  crop: ScanCrop | null,
  tone = DEFAULT_SCAN_TONE,
  maxEdge = MAX_SCAN_EDGE,
) {
  if (!crop) return drawScannedImage(canvas, image, rotation, finish, tone, maxEdge);

  const sourceCanvas = document.createElement('canvas');
  drawScannedImage(sourceCanvas, image, rotation, 'original', tone, maxEdge);
  const sourceContext = sourceCanvas.getContext('2d');
  const targetContext = canvas.getContext('2d');
  if (!sourceContext || !targetContext) throw new Error('Canvas 2D context unavailable');
  const size = getScanCropOutputSize(sourceCanvas.width, sourceCanvas.height, crop, maxEdge);
  const warped = warpScanCrop(
    sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height),
    crop,
    size.width,
    size.height,
  );
  const warpedCanvas = document.createElement('canvas');
  warpedCanvas.width = size.width;
  warpedCanvas.height = size.height;
  warpedCanvas.getContext('2d')?.putImageData(new ImageData(warped.data, warped.width, warped.height), 0, 0);
  canvas.width = size.width;
  canvas.height = size.height;
  targetContext.fillStyle = '#ffffff';
  targetContext.fillRect(0, 0, size.width, size.height);
  targetContext.filter = finish === 'document'
    ? 'grayscale(0.3) contrast(1.28) brightness(1.07)'
    : 'none';
  targetContext.drawImage(warpedCanvas, 0, 0);
  applyScanTone(canvas, targetContext, finish, tone);
  return size;
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
  const toneControls = root.querySelector<HTMLElement>('#scan-tone-controls');
  const contrast = root.querySelector<HTMLInputElement>('#scan-contrast');
  const brightness = root.querySelector<HTMLInputElement>('#scan-brightness');
  const threshold = root.querySelector<HTMLInputElement>('#scan-threshold');
  const previewPanel = root.querySelector<HTMLElement>('#scan-finish-preview');
  const previewSelect = root.querySelector<HTMLSelectElement>('#scan-preview-page');
  const previewCanvas = root.querySelector<HTMLCanvasElement>('#scan-preview-canvas');
  const previewStatus = root.querySelector<HTMLElement>('#scan-preview-status');
  const format = root.querySelector<HTMLSelectElement>('#scan-page-format');
  const margin = root.querySelector<HTMLSelectElement>('#scan-margin');
  const action = root.querySelector<HTMLButtonElement>('#scan-download-action');
  const clear = root.querySelector<HTMLButtonElement>('#scan-clear-action');
  const cropEditor = root.querySelector<HTMLElement>('#scan-crop-editor');
  const cropCanvas = root.querySelector<HTMLCanvasElement>('#scan-crop-canvas');
  const cropTitle = root.querySelector<HTMLElement>('#scan-crop-title');
  const cropApply = root.querySelector<HTMLButtonElement>('#scan-crop-apply');
  const cropCancel = root.querySelector<HTMLButtonElement>('#scan-crop-cancel');
  const cropReset = root.querySelector<HTMLButtonElement>('#scan-crop-reset');
  const toolButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-image-tool]'));
  const toolPanels = Array.from(root.querySelectorAll<HTMLElement>('[data-image-tool-panel]'));
  if (!panel || !zone || !input || !camera || !list || !empty || !status || !finish || !format || !margin || !action || !clear
    || !toneControls || !contrast || !brightness || !threshold || !previewPanel || !previewSelect || !previewCanvas || !previewStatus) {
    return () => undefined;
  }

  let pages: ScanSourcePage[] = [];
  let cropPageId: string | null = null;
  let cropPhoto: HTMLCanvasElement | null = null;
  let cropRequest = 0;
  let cropFrame: number | null = null;
  let cropPoints = cloneScanCrop(EDITOR_SCAN_CROP);
  let activeCropPoint: number | null = null;
  const cleanups: Array<() => void> = [];
  let previewPage: ScanSourcePage | undefined;
  let previewPhoto: HTMLCanvasElement | null = null;
  let previewFrame: number | null = null;

  const getTone = (): ScanTone => ({
    contrast: contrast.valueAsNumber,
    brightness: brightness.valueAsNumber,
    threshold: threshold.valueAsNumber,
  });

  const refreshPreview = () => {
    if (!previewPhoto || previewFrame !== null) return;
    previewFrame = requestAnimationFrame(() => {
      previewFrame = null;
      if (!previewPhoto) return;
      drawScannedImage(previewCanvas, previewPhoto, 0, finish.value as ScanFinish, getTone(), 800);
      previewCanvas.hidden = false;
    });
  };

  const loadPreview = async () => {
    const page = previewPanel.hidden ? undefined : pages.find(candidate => candidate.id === previewSelect.value);
    if (page === previewPage) return;
    previewPage = page;
    previewPhoto = null;
    previewCanvas.hidden = true;
    previewStatus.textContent = '';
    if (!page) return;
    previewStatus.textContent = i18n('Preparing preview…', 'Preparando vista previa…');
    try {
      const image = await decodeImage(page.file);
      if (previewPage !== page) return;
      const photo = previewCanvas.ownerDocument.createElement('canvas');
      drawCroppedScannedImage(photo, image, page.rotation, 'original', page.crop, DEFAULT_SCAN_TONE, 800);
      previewPhoto = photo;
      previewStatus.textContent = '';
      refreshPreview();
    } catch {
      if (previewPage !== page) return;
      previewPage = undefined;
      previewStatus.textContent = i18n('Preview unavailable', 'No se pudo mostrar la vista previa');
    }
  };

  const updateFinishControls = () => {
    const grayscale = finish.value === 'grayscale';
    const blackWhite = finish.value === 'black-white';
    toneControls.hidden = !pages.length || !(grayscale || blackWhite);
    previewPanel.hidden = toneControls.hidden;
    toneControls.querySelectorAll<HTMLElement>('[data-scan-tone]').forEach(group => {
      group.hidden = group.dataset.scanTone !== finish.value;
    });
    [contrast, brightness, threshold].forEach(slider => {
      const value = toneControls.querySelector<HTMLOutputElement>(`output[for="${slider.id}"]`);
      if (value) value.value = slider === threshold ? slider.value : `${slider.value}%`;
    });
    void loadPreview();
    refreshPreview();
  };
  finish.addEventListener('change', updateFinishControls);
  previewSelect.addEventListener('change', loadPreview);
  [contrast, brightness, threshold].forEach(slider => slider.addEventListener('input', updateFinishControls));
  cleanups.push(() => {
    finish.removeEventListener('change', updateFinishControls);
    previewSelect.removeEventListener('change', loadPreview);
    [contrast, brightness, threshold].forEach(slider => slider.removeEventListener('input', updateFinishControls));
    if (previewFrame !== null) cancelAnimationFrame(previewFrame);
    previewPage = undefined;
    previewPhoto = null;
  });

  const canEditCrop = Boolean(cropEditor && cropCanvas && cropTitle && cropApply && cropCancel && cropReset);

  const closeCropEditor = () => {
    cropRequest += 1;
    if (cropFrame !== null) cancelAnimationFrame(cropFrame);
    cropFrame = null;
    if (cropEditor) cropEditor.hidden = true;
    cropPageId = null;
    cropPhoto = null;
    activeCropPoint = null;
    document.body.classList.remove('scan-crop-open');
  };

  const renderCropEditor = () => {
    if (!cropCanvas || !cropPhoto) return;
    const context = cropCanvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.drawImage(cropPhoto, 0, 0);
    const points = cropPoints.map(point => ({ x: point.x * cropCanvas.width, y: point.y * cropCanvas.height }));
    context.save();
    context.beginPath();
    context.rect(0, 0, cropCanvas.width, cropCanvas.height);
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => context.lineTo(point.x, point.y));
    context.closePath();
    context.fillStyle = 'rgba(3, 11, 22, 0.58)';
    context.fill('evenodd');
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => context.lineTo(point.x, point.y));
    context.closePath();
    context.strokeStyle = '#4bd6ff';
    context.lineWidth = Math.max(4, Math.max(cropCanvas.width, cropCanvas.height) / 260);
    context.stroke();
    const radius = Math.max(15, Math.max(cropCanvas.width, cropCanvas.height) / 42);
    points.forEach((point, index) => {
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fillStyle = index === activeCropPoint ? '#ffffff' : '#4bd6ff';
      context.fill();
      context.strokeStyle = '#0d2137';
      context.lineWidth = Math.max(3, radius / 5);
      context.stroke();
    });
    context.restore();
  };

  const scheduleCropRender = () => {
    if (cropFrame !== null) return;
    cropFrame = requestAnimationFrame(() => {
      cropFrame = null;
      renderCropEditor();
    });
  };

  const openCropEditor = async (page: ScanSourcePage) => {
    if (!canEditCrop || !cropEditor || !cropCanvas || !cropTitle) return;
    closeCropEditor();
    const request = cropRequest;
    status.textContent = i18n('Preparing crop editor...', 'Preparando editor de recorte...');
    try {
      const image = await decodeImage(page.file);
      if (request !== cropRequest || !pages.includes(page)) return;

      const photo = cropCanvas.ownerDocument.createElement('canvas');
      drawScannedImage(photo, image, page.rotation, 'original');
      cropCanvas.width = photo.width;
      cropCanvas.height = photo.height;
      cropPhoto = photo;
      cropPageId = page.id;
      cropPoints = cloneScanCrop(page.crop || EDITOR_SCAN_CROP);
      renderCropEditor();
      cropTitle.textContent = i18n('Adjust document edges', 'Ajusta los bordes del documento');
      cropEditor.hidden = false;
      document.body.classList.add('scan-crop-open');
      status.textContent = i18n(
        'Drag each corner onto the document edge',
        'Arrastra cada esquina hasta el borde del documento',
      );
    } catch {
      if (request !== cropRequest || !pages.includes(page)) return;
      closeCropEditor();
      status.textContent = i18n('The image could not be read', 'No se pudo leer la imagen');
    }
  };

  const setTool = (tool: string) => {
    if (tool !== 'scan') closeCropEditor();
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
    action.disabled = !hasPages || action.hasAttribute('aria-busy');
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
    const previousPreview = previewSelect.value;
    previewSelect.replaceChildren(...pages.map((page, index) => new Option(
      i18n('Page {{page}}', 'Página {{page}}', { page: String(index + 1) }), page.id,
    )));
    if (pages.some(page => page.id === previousPreview)) previewSelect.value = previousPreview;
    updateFinishControls();
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
      if (page.crop) {
        const adjusted = document.createElement('small');
        adjusted.className = 'scan-page-adjusted';
        adjusted.textContent = i18n('Edges adjusted', 'Bordes ajustados');
        copy.appendChild(adjusted);
      }

      const controls = document.createElement('div');
      controls.className = 'scan-page-actions';
      const actions = [
        ...(canEditCrop ? [['crop', '⌗', i18n('Crop and straighten', 'Recortar y enderezar')]] : []),
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
      crop: null,
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
    } else if (actionName === 'crop') {
      void openCropEditor(pages[index]);
      return;
    } else if (actionName === 'rotate') {
      const page = pages[index];
      pages = pages.map((candidate, pageIndex) => pageIndex === index
        ? { ...page, rotation: ((page.rotation + 90) % 360) as ScanSourcePage['rotation'], crop: null }
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

  if (canEditCrop && cropCanvas && cropApply && cropCancel && cropReset && cropEditor) {
    const getPointer = (event: PointerEvent) => {
      const bounds = cropCanvas.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1))),
        y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(bounds.height, 1))),
      };
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!cropPhoto) return;
      const point = getPointer(event);
      let closest = 0;
      let distance = Number.POSITIVE_INFINITY;
      cropPoints.forEach((candidate, index) => {
        const candidateDistance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
        if (candidateDistance < distance) {
          closest = index;
          distance = candidateDistance;
        }
      });
      activeCropPoint = closest;
      cropCanvas.setPointerCapture?.(event.pointerId);
      cropPoints[closest] = point;
      scheduleCropRender();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (activeCropPoint === null) return;
      cropPoints[activeCropPoint] = getPointer(event);
      scheduleCropRender();
    };
    const onPointerUp = () => {
      if (activeCropPoint === null) return;
      activeCropPoint = null;
      scheduleCropRender();
    };
    const onApplyCrop = () => {
      if (!cropPageId) return;
      pages = pages.map(page => page.id === cropPageId ? { ...page, crop: cloneScanCrop(cropPoints) } : page);
      closeCropEditor();
      renderPages();
      status.textContent = i18n('Document edges adjusted', 'Bordes del documento ajustados');
    };
    const onResetCrop = () => {
      cropPoints = cloneScanCrop(FULL_SCAN_CROP);
      scheduleCropRender();
    };
    cropCanvas.addEventListener('pointerdown', onPointerDown);
    cropCanvas.addEventListener('pointermove', onPointerMove);
    cropCanvas.addEventListener('pointerup', onPointerUp);
    cropCanvas.addEventListener('pointercancel', onPointerUp);
    cropApply.addEventListener('click', onApplyCrop);
    cropCancel.addEventListener('click', closeCropEditor);
    cropReset.addEventListener('click', onResetCrop);
    cropEditor.addEventListener('click', event => {
      if (event.target === cropEditor) closeCropEditor();
    });
    cleanups.push(() => {
      cropCanvas.removeEventListener('pointerdown', onPointerDown);
      cropCanvas.removeEventListener('pointermove', onPointerMove);
      cropCanvas.removeEventListener('pointerup', onPointerUp);
      cropCanvas.removeEventListener('pointercancel', onPointerUp);
      cropApply.removeEventListener('click', onApplyCrop);
      cropCancel.removeEventListener('click', closeCropEditor);
      cropReset.removeEventListener('click', onResetCrop);
    });
  }

  const clearPages = () => {
    closeCropEditor();
    pages.forEach(page => revokeObjectUrl(page.previewUrl));
    pages = [];
    zone.classList.remove('has-pages');
    renderPages();
  };
  clear.addEventListener('click', clearPages);
  cleanups.push(() => clear.removeEventListener('click', clearPages));

  const onCropEditorKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && cropEditor && !cropEditor.hidden) closeCropEditor();
  };
  document.addEventListener('keydown', onCropEditorKeydown);
  cleanups.push(() => document.removeEventListener('keydown', onCropEditorKeydown));

  const preparePage = async (page: ScanSourcePage, selectedFinish: ScanFinish, tone: ScanTone): Promise<ScannedImagePage> => {
    const image = await decodeImage(page.file);
    const canvas = document.createElement('canvas');
    const size = drawCroppedScannedImage(canvas, image, page.rotation, selectedFinish, page.crop, tone);
    const blob = await canvasToJpeg(canvas);
    return { bytes: await blob.arrayBuffer(), type: 'image/jpeg', ...size };
  };

  const onDownload = async () => {
    if (!pages.length || action.disabled) return;
    action.disabled = true;
    action.setAttribute('aria-busy', 'true');
    const selectedFinish = finish.value as ScanFinish;
    const tone = getTone();
    const exportPages = [...pages];
    status.textContent = i18n('Preparing scanned pages...', 'Preparando páginas escaneadas...');
    try {
      const prepared: ScannedImagePage[] = [];
      for (let index = 0; index < exportPages.length; index += 1) {
        status.textContent = i18n(
          'Preparing page {{page}} of {{total}}...',
          'Preparando página {{page}} de {{total}}...',
          { page: String(index + 1), total: String(exportPages.length) },
        );
        prepared.push(await preparePage(exportPages[index], selectedFinish, tone));
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
    closeCropEditor();
    cleanups.forEach(cleanup => cleanup());
    pages.forEach(page => revokeObjectUrl(page.previewUrl));
  };
}
