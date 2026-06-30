import type { ObjectUrlRuntime, PreparedSignatureState } from '../state/prepared-signature';
import type { SignatureGeneratorState } from '../state/signature-generator';
import {
  generatePreparedSignaturePng,
  type SignatureGenerationOptions,
  type SignatureGenerationResult,
} from './signature-generation-action';

export type GenerateStoredPreparedSignatureOptions = Omit<SignatureGenerationOptions, 'state'> & {
  generatorState: SignatureGeneratorState;
  preparedState: PreparedSignatureState;
  urls: ObjectUrlRuntime;
  generatePreparedSignature?: typeof generatePreparedSignaturePng;
};

export type GenerateStoredPreparedSignatureResult =
  | Exclude<SignatureGenerationResult, { status: 'ok' }>
  | {
    status: 'ok';
    previewUrl: string;
    width: number;
    height: number;
  };

export async function generateStoredPreparedSignaturePng({
  generatorState,
  preparedState,
  urls,
  generatePreparedSignature = generatePreparedSignaturePng,
  ...generationOptions
}: GenerateStoredPreparedSignatureOptions): Promise<GenerateStoredPreparedSignatureResult> {
  const result = await generatePreparedSignature({
    ...generationOptions,
    state: generatorState,
  });

  if (result.status !== 'ok') return result;

  const previewUrl = preparedState.setPrepared(result.prepared, urls);
  return {
    status: 'ok',
    previewUrl,
    width: result.prepared.width,
    height: result.prepared.height,
  };
}
