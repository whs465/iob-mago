import type { PreparedSignatureState } from './prepared-signature';
import type { SignatureGeneratorState } from './signature-generator';

export type SignatureGenerationScheduleResult =
  | { status: 'skipped' }
  | { status: 'scheduled' };

export type SchedulePreparedSignatureRecolorOptions = {
  generatorState: SignatureGeneratorState;
  preparedState: PreparedSignatureState;
  delayMs?: number;
  onRecolor(): void;
};

export type SchedulePreparedSignatureRegenerateOptions = {
  generatorState: SignatureGeneratorState;
  preparedState: PreparedSignatureState;
  force?: boolean;
  delayMs?: number;
  onRegenerate(): void;
};

export function schedulePreparedSignatureRecolorAction({
  generatorState,
  preparedState,
  delayMs = 80,
  onRecolor,
}: SchedulePreparedSignatureRecolorOptions): SignatureGenerationScheduleResult {
  if (!preparedState.hasPreparedSignature) return { status: 'skipped' };

  generatorState.setRecolorTimer(setTimeout(() => {
    generatorState.clearRecolorTimer();
    onRecolor();
  }, delayMs));

  return { status: 'scheduled' };
}

export function schedulePreparedSignatureRegenerateAction({
  generatorState,
  preparedState,
  force = false,
  delayMs = 180,
  onRegenerate,
}: SchedulePreparedSignatureRegenerateOptions): SignatureGenerationScheduleResult {
  if (!generatorState.sourceFile) return { status: 'skipped' };
  if (!force && !preparedState.hasPreparedSignature) return { status: 'skipped' };

  generatorState.setRegenerateTimer(setTimeout(() => {
    generatorState.clearRegenerateTimer();
    onRegenerate();
  }, delayMs));

  return { status: 'scheduled' };
}
