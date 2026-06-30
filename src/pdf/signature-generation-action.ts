import { prepareSignaturePng, type PreparedSignaturePng, type PrepareSignaturePngOptions } from './signature-preparation';
import type { SignatureGeneratorState } from '../state/signature-generator';
import type { SignatureInkColor } from '../utils/signature-png';

export type SignatureGenerationMessages = Pick<
  PrepareSignaturePngOptions,
  'imageLoadErrorMessage' | 'noSignatureMessage' | 'pngCreationErrorMessage'
>;

export type SignatureGenerationOptions = SignatureGenerationMessages & {
  state: SignatureGeneratorState;
  sensitivity: string;
  trim: boolean;
  color: SignatureInkColor;
  prepareSignaturePng?: typeof prepareSignaturePng;
  onGenerationStarted?: () => void;
  onGenerationFinished?: () => void;
};

export type SignatureGenerationResult =
  | { status: 'missing-source' }
  | { status: 'queued' }
  | { status: 'stale-source' }
  | { status: 'ok'; prepared: PreparedSignaturePng };

export async function generatePreparedSignaturePng(
  options: SignatureGenerationOptions,
): Promise<SignatureGenerationResult> {
  if (!options.state.sourceFile) return { status: 'missing-source' };

  if (!options.state.beginGeneration()) {
    return { status: 'queued' };
  }

  options.onGenerationStarted?.();

  try {
    const sourceFile = options.state.sourceFile;
    const sourceVersion = options.state.sourceVersion;
    const runPrepare = options.prepareSignaturePng ?? prepareSignaturePng;
    const prepared = await runPrepare({
      sourceFile,
      sensitivity: options.sensitivity,
      trim: options.trim,
      color: options.color,
      imageLoadErrorMessage: options.imageLoadErrorMessage,
      noSignatureMessage: options.noSignatureMessage,
      pngCreationErrorMessage: options.pngCreationErrorMessage,
    });

    if (!options.state.isSourceVersionCurrent(sourceVersion)) {
      options.state.queueRegeneration();
      return { status: 'stale-source' };
    }

    return { status: 'ok', prepared };
  } finally {
    options.state.finishGeneration();
    options.onGenerationFinished?.();
  }
}
