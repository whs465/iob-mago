import { getFileBaseName } from '../utils/filenames';
import {
  type PreparedSignatureResult,
  type SignatureInkColor,
  buildPreparedSignature,
  canvasToPngBlob,
  loadImageElementFromFile,
} from '../utils/signature-png';

export type PrepareSignaturePngDeps = {
  loadImageElementFromFile(file: File, errorMessage: string): Promise<HTMLImageElement>;
  buildPreparedSignature(
    image: HTMLImageElement,
    options: {
      sensitivity: string | number;
      trim: boolean;
      color?: SignatureInkColor;
      noSignatureMessage: string;
    },
  ): PreparedSignatureResult;
  canvasToPngBlob(canvas: HTMLCanvasElement, errorMessage: string): Promise<Blob>;
};

export type PrepareSignaturePngOptions = {
  sourceFile: File;
  sensitivity: string;
  trim: boolean;
  color: SignatureInkColor;
  imageLoadErrorMessage: string;
  noSignatureMessage: string;
  pngCreationErrorMessage: string;
  deps?: PrepareSignaturePngDeps;
};

export type PreparedSignaturePng = {
  canvas: HTMLCanvasElement;
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
};

const defaultDeps: PrepareSignaturePngDeps = {
  loadImageElementFromFile,
  buildPreparedSignature,
  canvasToPngBlob,
};

export async function prepareSignaturePng({
  sourceFile,
  sensitivity,
  trim,
  color,
  imageLoadErrorMessage,
  noSignatureMessage,
  pngCreationErrorMessage,
  deps = defaultDeps,
}: PrepareSignaturePngOptions): Promise<PreparedSignaturePng> {
  const image = await deps.loadImageElementFromFile(sourceFile, imageLoadErrorMessage);
  const processed = deps.buildPreparedSignature(image, {
    sensitivity,
    trim,
    color,
    noSignatureMessage,
  });
  const blob = await deps.canvasToPngBlob(processed.canvas, pngCreationErrorMessage);

  return {
    canvas: processed.canvas,
    blob,
    fileName: `${getFileBaseName(sourceFile.name || 'firma')}-firma.png`,
    width: processed.width,
    height: processed.height,
  };
}
