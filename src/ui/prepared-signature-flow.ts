import {
  createPreparedSignatureFile,
  type PreparedSignatureFileResult,
} from '../pdf/prepared-signature-actions';
import type { ObjectUrlRuntime, PreparedSignatureState } from '../state/prepared-signature';
import type { SignatureGeneratorState } from '../state/signature-generator';
import type { SignatureMetaTranslator } from './signature-preview';
import {
  clearPreparedSignaturePreview,
  setPreparedSignatureActionsEnabled,
  updateSignatureGeneratorMeta,
} from './signature-preview';

export type ResetPreparedSignatureFlowOptions = {
  preparedState: PreparedSignatureState;
  generatorState: SignatureGeneratorState;
  urls: Pick<ObjectUrlRuntime, 'revokeObjectURL'>;
};

export function resetPreparedSignatureFlow({
  preparedState,
  generatorState,
  urls,
}: ResetPreparedSignatureFlowOptions) {
  preparedState.reset(urls);
  generatorState.reset();

  clearPreparedSignaturePreview();
  updateSignatureGeneratorMeta('');
  setPreparedSignatureActionsEnabled(false);
}

export type UsePreparedSignatureFlowOptions = {
  preparedState: PreparedSignatureState;
  i18n: SignatureMetaTranslator;
  showStatus(message: string, type: 'success'): void;
  setSignatureImageFile(file: File): Promise<void>;
  createFile?: typeof createPreparedSignatureFile;
};

export async function usePreparedSignatureFlow({
  preparedState,
  i18n,
  showStatus,
  setSignatureImageFile,
  createFile = createPreparedSignatureFile,
}: UsePreparedSignatureFlowOptions): Promise<PreparedSignatureFileResult> {
  const result = createFile(preparedState);
  if (result.status === 'missing-prepared-signature') return result;

  await setSignatureImageFile(result.file);
  showStatus(
    i18n('Generated PNG loaded as the active signature', 'PNG generado cargado como firma activa'),
    'success',
  );

  return result;
}
