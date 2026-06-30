import type { ObjectUrlRuntime, PreparedSignatureState } from '../state/prepared-signature';
import { canvasToPngBlob } from '../utils/signature-png';
import { recolorCanvasPixels, type RgbColor } from '../utils/signature-recolor';

export type RecolorPreparedSignatureDeps = {
  recolorCanvasPixels?: typeof recolorCanvasPixels;
  canvasToPngBlob?: typeof canvasToPngBlob;
};

export type RecolorPreparedSignatureOptions = {
  state: PreparedSignatureState;
  color: RgbColor;
  pngCreationErrorMessage: string;
  urls: ObjectUrlRuntime;
  deps?: RecolorPreparedSignatureDeps;
};

export type RecolorPreparedSignatureResult =
  | { status: 'missing-canvas' }
  | {
    status: 'ok';
    previewUrl: string;
    width: number;
    height: number;
  };

export async function recolorPreparedSignaturePng({
  state,
  color,
  pngCreationErrorMessage,
  urls,
  deps = {},
}: RecolorPreparedSignatureOptions): Promise<RecolorPreparedSignatureResult> {
  if (!state.canvas) return { status: 'missing-canvas' };

  const runRecolor = deps.recolorCanvasPixels ?? recolorCanvasPixels;
  const runCanvasToPngBlob = deps.canvasToPngBlob ?? canvasToPngBlob;

  runRecolor(state.canvas, color);
  const blob = await runCanvasToPngBlob(state.canvas, pngCreationErrorMessage);
  const previewUrl = state.updateBlob(blob, urls);

  return {
    status: 'ok',
    previewUrl,
    width: state.canvas.width,
    height: state.canvas.height,
  };
}
