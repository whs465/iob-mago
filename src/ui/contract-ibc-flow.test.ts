// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupContractIbcFlow } from './contract-ibc-flow';

function mountDom() {
  document.body.innerHTML = `
    <span id="ibc-heading-icon"></span>
    <input id="ibc-monthly-income">
    <input type="radio" name="ibc-period-mode" value="full-month" checked>
    <input type="radio" name="ibc-period-mode" value="days">
    <div id="ibc-day-fields" hidden>
      <input id="ibc-start-date"><input id="ibc-end-date">
    </div>
    <strong id="ibc-result-value"></strong>
    <span id="ibc-result-detail"></span>
    <span id="ibc-result-note"></span>
    <span id="ibc-health-value"></span>
    <span id="ibc-pension-value"></span>
    <span id="ibc-arl-rate"></span>
    <span id="ibc-arl-value"></span>
    <span id="ibc-total-value"></span>
    <button id="ibc-copy"></button>
  `;
}

const i18n = (english: string, _spanish: string, values: Record<string, string> = {}) =>
  Object.entries(values).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), english);

describe('contract IBC flow', () => {
  beforeEach(() => {
    localStorage.clear();
    mountDom();
  });

  it('calculates and stores a full-month IBC', () => {
    setupContractIbcFlow({ i18n });
    const amount = document.getElementById('ibc-monthly-income') as HTMLInputElement;
    amount.value = '10000000';
    amount.dispatchEvent(new Event('input'));

    expect(document.getElementById('ibc-result-value')?.textContent).toContain('4,000,000');
    expect(document.getElementById('ibc-health-value')?.textContent).toContain('500,000');
    expect(document.getElementById('ibc-pension-value')?.textContent).toContain('640,000');
    expect(document.getElementById('ibc-arl-value')?.textContent).toContain('20,900');
    expect(document.getElementById('ibc-total-value')?.textContent).toContain('1,160,900');
    expect(localStorage.getItem('contractIbcCalculator')).toContain('10000000');
    expect((document.getElementById('ibc-copy') as HTMLButtonElement).disabled).toBe(false);
  });

  it('asks for dates and calculates an inclusive partial month', () => {
    setupContractIbcFlow({ i18n });
    const amount = document.getElementById('ibc-monthly-income') as HTMLInputElement;
    amount.value = '10000000';
    (document.querySelector('input[value="days"]') as HTMLInputElement).checked = true;
    document.querySelector('input[value="days"]')?.dispatchEvent(new Event('change'));
    (document.getElementById('ibc-start-date') as HTMLInputElement).value = '2026-11-10';
    (document.getElementById('ibc-end-date') as HTMLInputElement).value = '2026-11-19';
    document.getElementById('ibc-end-date')?.dispatchEvent(new Event('input'));

    expect(document.getElementById('ibc-day-fields')?.hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('ibc-result-detail')?.textContent).toContain('10 day(s) of 30');
    expect(document.getElementById('ibc-result-value')?.textContent).toContain('1,333,334');
  });

  it('copies the unformatted IBC value', async () => {
    const copyText = vi.fn(async () => undefined);
    setupContractIbcFlow({ i18n, copyText });
    const amount = document.getElementById('ibc-monthly-income') as HTMLInputElement;
    amount.value = '10000000';
    amount.dispatchEvent(new Event('input'));
    document.getElementById('ibc-copy')?.click();
    await Promise.resolve();

    expect(copyText).toHaveBeenCalledWith('4000000');
    expect(document.getElementById('ibc-copy')?.classList).toContain('is-copied');
  });
});
