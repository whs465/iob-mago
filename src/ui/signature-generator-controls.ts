import type { AppLanguage } from '../utils/locale';
import { getSignatureTone } from '../utils/signature-tone';
import { updateSignatureCleanValue, updateSignatureToneDisplay } from './signature-preview';

export type SignatureGeneratorControlsRuntime = {
  getInputValue(id: string): string;
  getLanguage(): AppLanguage;
  scheduleRecolor(): void;
  scheduleRegenerate(): void;
};

export function getSelectedSignatureTone(
  runtime: Pick<SignatureGeneratorControlsRuntime, 'getInputValue' | 'getLanguage'>,
  toneValue = runtime.getInputValue('signature-tone-range'),
) {
  return getSignatureTone(toneValue, runtime.getLanguage());
}

export function updateSignatureCleanSensitivityControl(
  runtime: Pick<SignatureGeneratorControlsRuntime, 'getInputValue' | 'scheduleRegenerate'>,
  refreshPrepared = true,
) {
  const value = runtime.getInputValue('signature-clean-sensitivity');
  updateSignatureCleanValue(value);
  if (refreshPrepared) runtime.scheduleRegenerate();
}

export function updateSignatureToneControl(
  runtime: Pick<SignatureGeneratorControlsRuntime, 'getInputValue' | 'getLanguage' | 'scheduleRecolor'>,
  refreshPrepared = false,
) {
  const tone = getSelectedSignatureTone(runtime);
  updateSignatureToneDisplay(tone.label, tone.color);

  if (refreshPrepared) runtime.scheduleRecolor();

  return tone;
}
