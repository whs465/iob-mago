// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  getSelectedSignatureTone,
  updateSignatureCleanSensitivityControl,
  updateSignatureToneControl,
  type SignatureGeneratorControlsRuntime,
} from './signature-generator-controls';

function createRuntime(overrides: Partial<SignatureGeneratorControlsRuntime> = {}): SignatureGeneratorControlsRuntime {
  return {
    getInputValue: id => {
      if (id === 'signature-clean-sensitivity') return '42';
      if (id === 'signature-tone-range') return '100';
      return '';
    },
    getLanguage: () => 'en',
    scheduleRecolor: vi.fn(),
    scheduleRegenerate: vi.fn(),
    ...overrides,
  };
}

describe('signature generator controls', () => {
  it('reads the selected signature tone from the tone slider and language', () => {
    const tone = getSelectedSignatureTone(createRuntime({
      getInputValue: () => '90',
      getLanguage: () => 'es',
    }));

    expect(tone.label).toBe('Morado oscuro');
    expect(tone.value).toBe(90);
  });

  it('updates cleanup sensitivity and schedules regeneration by default', () => {
    document.body.innerHTML = '<span id="signature-clean-value"></span>';
    const scheduleRegenerate = vi.fn();

    updateSignatureCleanSensitivityControl(createRuntime({ scheduleRegenerate }));

    expect(document.getElementById('signature-clean-value')?.textContent).toBe('42');
    expect(scheduleRegenerate).toHaveBeenCalledTimes(1);
  });

  it('can update cleanup sensitivity without scheduling regeneration', () => {
    document.body.innerHTML = '<span id="signature-clean-value"></span>';
    const scheduleRegenerate = vi.fn();

    updateSignatureCleanSensitivityControl(createRuntime({ scheduleRegenerate }), false);

    expect(document.getElementById('signature-clean-value')?.textContent).toBe('42');
    expect(scheduleRegenerate).not.toHaveBeenCalled();
  });

  it('updates tone display and schedules recolor only when requested', () => {
    document.body.innerHTML = `
      <div id="signature-tone-name"></div>
      <div id="signature-color-dot"></div>
    `;
    const scheduleRecolor = vi.fn();
    const runtime = createRuntime({ scheduleRecolor });

    const tone = updateSignatureToneControl(runtime);

    expect(tone.label).toBe('Graphite');
    expect(document.getElementById('signature-tone-name')?.textContent).toBe('Graphite');
    expect(document.getElementById('signature-color-dot')?.style.background).toBe('rgb(17, 24, 39)');
    expect(scheduleRecolor).not.toHaveBeenCalled();

    updateSignatureToneControl(runtime, true);

    expect(scheduleRecolor).toHaveBeenCalledTimes(1);
  });
});
