import type { SignatureMetaTranslator } from './signature-preview';
import { screenshotPngToPdf } from '../pdf/screenshot-to-pdf';
import { pdfBytesToBlob } from '../utils/pdf-bytes';

export type ScreenshotPolishStyle = {
  radius: number;
  padding: number;
  shadow: 'none' | 'soft' | 'medium';
  background: 'transparent' | 'surface' | 'white';
};

type DrawableImage = CanvasImageSource & { width: number; height: number };

export type ScreenshotPolishOptions = {
  root?: ParentNode;
  i18n: SignatureMetaTranslator;
  saveAs(blob: Blob, filename: string): void;
  decodeImage?: (file: Blob) => Promise<DrawableImage>;
  copyBlob?: (blob: Blob) => Promise<void>;
  createPdf?: (pngBlob: Blob) => Promise<Uint8Array>;
};

const MAX_IMAGE_EDGE = 4096;

export function getScaledScreenshotSize(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.min(1, maxEdge / Math.max(safeWidth, safeHeight));
  return {
    width: Math.round(safeWidth * scale),
    height: Math.round(safeHeight * scale),
  };
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

export function drawPolishedScreenshot(
  canvas: HTMLCanvasElement,
  image: DrawableImage,
  style: ScreenshotPolishStyle,
) {
  const imageSize = getScaledScreenshotSize(image.width, image.height);
  const padding = Math.max(0, style.padding);
  canvas.width = imageSize.width + padding * 2;
  canvas.height = imageSize.height + padding * 2;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.clearRect(0, 0, canvas.width, canvas.height);

  const background = {
    transparent: null,
    surface: '#f5f5f7',
    white: '#ffffff',
  }[style.background];
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const shadow = {
    none: { color: 'transparent', blur: 0, offsetY: 0 },
    soft: { color: 'rgba(15, 23, 42, 0.16)', blur: 22, offsetY: 8 },
    medium: { color: 'rgba(15, 23, 42, 0.22)', blur: 32, offsetY: 12 },
  }[style.shadow];

  context.save();
  context.shadowColor = shadow.color;
  context.shadowBlur = shadow.blur;
  context.shadowOffsetY = shadow.offsetY;
  context.fillStyle = '#ffffff';
  roundedRectPath(context, padding, padding, imageSize.width, imageSize.height, style.radius);
  context.fill();
  context.restore();

  context.save();
  roundedRectPath(context, padding, padding, imageSize.width, imageSize.height, style.radius);
  context.clip();
  context.drawImage(image, padding, padding, imageSize.width, imageSize.height);
  context.restore();

  context.strokeStyle = 'rgba(29, 29, 31, 0.16)';
  context.lineWidth = 1;
  roundedRectPath(context, padding + 0.5, padding + 0.5, imageSize.width - 1, imageSize.height - 1, style.radius);
  context.stroke();

  return { width: canvas.width, height: canvas.height };
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

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create the PNG'));
    }, 'image/png');
  });
}

function outputFilename(sourceName?: string, extension = 'png') {
  const base = (sourceName || 'captura').replace(/\.[^.]+$/, '') || 'captura';
  return `${base}-pro.${extension}`;
}

export function setupScreenshotPolish({
  root = document,
  i18n,
  saveAs,
  decodeImage = decodeImageFile,
  copyBlob,
  createPdf = screenshotPngToPdf,
}: ScreenshotPolishOptions) {
  const zone = root.querySelector<HTMLElement>('#screenshot-paste-zone');
  const input = root.querySelector<HTMLInputElement>('#screenshot-input');
  const canvas = root.querySelector<HTMLCanvasElement>('#screenshot-canvas');
  const placeholder = root.querySelector<HTMLElement>('#screenshot-preview-empty');
  const status = root.querySelector<HTMLElement>('#screenshot-status');
  const copy = root.querySelector<HTMLButtonElement>('#screenshot-copy-action');
  const download = root.querySelector<HTMLButtonElement>('#screenshot-download-action');
  const downloadLabel = root.querySelector<HTMLElement>('#screenshot-download-label');
  const radius = root.querySelector<HTMLSelectElement>('#screenshot-radius');
  const shadow = root.querySelector<HTMLSelectElement>('#screenshot-shadow');
  const padding = root.querySelector<HTMLSelectElement>('#screenshot-padding');
  const background = root.querySelector<HTMLSelectElement>('#screenshot-background');
  const format = root.querySelector<HTMLSelectElement>('#screenshot-format');
  if (!zone || !input || !canvas || !placeholder || !status || !copy || !download || !radius || !shadow || !padding || !background || !format) {
    return () => undefined;
  }

  let image: DrawableImage | null = null;
  let sourceName = 'captura';
  const cleanups: Array<() => void> = [];
  const ownerDocument = zone.ownerDocument;
  const copyPng = copyBlob ?? (async (blob: Blob) => {
    const view = ownerDocument.defaultView as (Window & typeof globalThis) | null;
    if (!view?.navigator.clipboard?.write || !view.ClipboardItem) {
      throw new Error('Image clipboard is unavailable');
    }
    await view.navigator.clipboard.write([new view.ClipboardItem({ 'image/png': blob })]);
  });

  const getStyle = (): ScreenshotPolishStyle => ({
    radius: Number(radius.value) || 14,
    padding: Number(padding.value) || 36,
    shadow: shadow.value === 'none' || shadow.value === 'medium' ? shadow.value : 'soft',
    background: background.value === 'white' || background.value === 'surface'
      ? background.value
      : 'transparent',
  });

  const updateDownloadLabel = () => {
    const text = format.value === 'pdf'
      ? i18n('Download PDF', 'Descargar PDF')
      : i18n('Download PNG', 'Descargar PNG');
    if (downloadLabel) downloadLabel.textContent = text;
    else download.textContent = text;
  };

  const render = () => {
    if (!image) return;
    const size = drawPolishedScreenshot(canvas, image, getStyle());
    canvas.hidden = false;
    placeholder.hidden = true;
    copy.disabled = false;
    download.disabled = false;
    status.textContent = i18n(
      'Ready to download · {{width}} × {{height}} px',
      'Lista para descargar · {{width}} × {{height}} px',
      { width: String(size.width), height: String(size.height) },
    );
  };

  const load = async (file: Blob & { name?: string }) => {
    if (!file.type.startsWith('image/')) {
      status.textContent = i18n('Paste or choose an image', 'Pega o elige una imagen');
      return;
    }
    status.textContent = i18n('Preparing preview...', 'Preparando vista previa...');
    try {
      image = await decodeImage(file);
      sourceName = file.name || 'captura';
      zone.classList.add('has-image');
      [radius, shadow, padding, background, format].forEach(control => { control.disabled = false; });
      render();
    } catch {
      status.textContent = i18n('The image could not be read', 'No se pudo leer la imagen');
    }
  };

  const onPaste = (event: ClipboardEvent) => {
    const section = zone.closest('section');
    const sectionRect = section?.getBoundingClientRect();
    if (
      sectionRect
      && sectionRect.height > 0
      && (sectionRect.bottom < 0 || sectionRect.top > ownerDocument.defaultView!.innerHeight)
    ) return;
    const item = Array.from(event.clipboardData?.items || []).find(entry => entry.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    void load(file);
  };
  ownerDocument.addEventListener('paste', onPaste);
  cleanups.push(() => ownerDocument.removeEventListener('paste', onPaste));

  const onInput = () => {
    const file = input.files?.[0];
    if (file) void load(file);
    input.value = '';
  };
  input.addEventListener('change', onInput);
  cleanups.push(() => input.removeEventListener('change', onInput));

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    zone.classList.add('is-dragging');
  };
  const onDragLeave = () => zone.classList.remove('is-dragging');
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    zone.classList.remove('is-dragging');
    const file = Array.from(event.dataTransfer?.files || []).find(candidate => candidate.type.startsWith('image/'));
    if (file) void load(file);
  };
  zone.addEventListener('dragover', onDragOver);
  zone.addEventListener('dragleave', onDragLeave);
  zone.addEventListener('drop', onDrop);
  cleanups.push(() => zone.removeEventListener('dragover', onDragOver));
  cleanups.push(() => zone.removeEventListener('dragleave', onDragLeave));
  cleanups.push(() => zone.removeEventListener('drop', onDrop));

  [radius, shadow, padding, background].forEach(control => {
    control.addEventListener('change', render);
    cleanups.push(() => control.removeEventListener('change', render));
  });
  format.addEventListener('change', updateDownloadLabel);
  cleanups.push(() => format.removeEventListener('change', updateDownloadLabel));

  const onCopy = async () => {
    if (!image) return;
    copy.disabled = true;
    status.textContent = i18n('Copying image...', 'Copiando imagen...');
    try {
      await copyPng(await canvasToBlob(canvas));
      status.textContent = i18n(
        'Image copied · paste it wherever you need it',
        'Imagen copiada · pégala donde la necesites',
      );
    } catch {
      status.textContent = i18n(
        'Your browser did not allow copying the image. You can still download the PNG.',
        'El navegador no permitió copiar la imagen. Todavía puedes descargar el PNG.',
      );
    } finally {
      copy.disabled = false;
    }
  };
  copy.addEventListener('click', onCopy);
  cleanups.push(() => copy.removeEventListener('click', onCopy));

  const onDownload = async () => {
    if (!image) return;
    download.disabled = true;
    try {
      const png = await canvasToBlob(canvas);
      if (format.value === 'pdf') {
        saveAs(pdfBytesToBlob(await createPdf(png)), outputFilename(sourceName, 'pdf'));
        status.textContent = i18n('PDF downloaded', 'PDF descargado');
      } else {
        saveAs(png, outputFilename(sourceName));
        status.textContent = i18n('PNG downloaded', 'PNG descargado');
      }
    } catch {
      status.textContent = i18n('The PNG could not be created', 'No se pudo crear el PNG');
    } finally {
      download.disabled = false;
    }
  };
  download.addEventListener('click', onDownload);
  cleanups.push(() => download.removeEventListener('click', onDownload));

  return () => cleanups.forEach(cleanup => cleanup());
}
