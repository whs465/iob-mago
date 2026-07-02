// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { updateSignatureProgress } from './signature-progress';

function appendSignatureSteps() {
  document.body.innerHTML = `
    <div data-signature-step="pdf"></div>
    <div data-signature-step="signature"></div>
    <div data-signature-step="marker"></div>
    <div data-signature-step="download"></div>
  `;
}

function step(name: string) {
  return document.querySelector(`[data-signature-step="${name}"]`) as HTMLElement;
}

describe('signature progress', () => {
  it('marks the first missing step as active', () => {
    appendSignatureSteps();

    updateSignatureProgress({
      hasPdf: true,
      hasSignature: false,
      hasMarker: false,
    });

    expect(step('pdf').classList.contains('signature-step-complete')).toBe(true);
    expect(step('signature').classList.contains('signature-step-active')).toBe(true);
    expect(step('marker').classList.contains('signature-step-complete')).toBe(false);
    expect(step('download').classList.contains('signature-step-complete')).toBe(false);
  });

  it('activates download when every requirement is ready', () => {
    appendSignatureSteps();

    updateSignatureProgress({
      hasPdf: true,
      hasSignature: true,
      hasMarker: true,
    });

    expect(step('download').classList.contains('signature-step-complete')).toBe(true);
    expect(step('download').classList.contains('signature-step-active')).toBe(true);
    expect(step('download').getAttribute('aria-current')).toBe('step');
  });
});
