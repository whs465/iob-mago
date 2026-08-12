// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { setupContractProgressFlow } from './contract-progress-flow';

function mountDom() {
  document.body.innerHTML = `
    <button id="contract-date-edit-action" aria-expanded="true"></button>
    <div id="contract-date-editor"></div>
    <input id="fecha-inicial"><input id="fecha-final">
    <span id="current-progress-number"></span><span id="current-progress-date"></span>
    <span id="last-report-number"></span><span id="last-report-meta"></span>
    <span id="contract-period-text"></span>
    <div id="contract-progress-fill"></div><div id="contract-timeline-track"></div>
    <p id="mensaje-guardado"></p>
  `;
}

const i18n = (english: string, _spanish: string, values: Record<string, string> = {}) =>
  Object.entries(values).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), english);

describe('contract progress flow', () => {
  beforeEach(() => {
    mountDom();
    localStorage.clear();
  });

  it('renders cross-year monthly reports and the latest closed cutoff automatically', () => {
    const api = setupContractProgressFlow({
      i18n,
      formatDateValue: date => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      formatDateTimeValue: date => date.toISOString(),
      now: () => new Date(2027, 2, 2),
    });
    (document.getElementById('fecha-inicial') as HTMLInputElement).value = '2026-12-01';
    (document.getElementById('fecha-final') as HTMLInputElement).value = '2027-04-03';

    api.autoCalcularAvance();

    expect(document.querySelectorAll('.contract-timeline-report')).toHaveLength(5);
    expect(document.getElementById('last-report-meta')?.textContent).toContain('Report 3 of 5');
    expect(document.getElementById('current-progress-date')?.textContent).toBe('As of 2027-3-2');
    expect(Array.from(document.querySelectorAll<HTMLElement>('.contract-timeline-report')).map(point => point.style.left))
      .toEqual(['20%', '40%', '60%', '80%', '100%']);
    expect(localStorage.getItem('fechasAvance')).toContain('2026-12-01');
  });

  it('loads saved dates and collapses their editor without a calculate action', () => {
    localStorage.setItem('fechasAvance', JSON.stringify({
      fechaInicial: '2026-12-01',
      fechaFinal: '2027-04-03',
    }));
    const api = setupContractProgressFlow({
      i18n,
      formatDateValue: date => date.toLocaleDateString('en-GB'),
      formatDateTimeValue: date => date.toISOString(),
      now: () => new Date(2027, 2, 2),
    });

    expect(api.initFromLocalStorage()).toBe(true);
    expect(document.getElementById('contract-date-editor')?.hasAttribute('hidden')).toBe(true);
    expect(document.getElementById('contract-date-edit-action')?.textContent).toBe('Edit');
  });
});
