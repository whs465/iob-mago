// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderContractProgressResult, resetContractProgressFields } from './contract-progress';

function mountContractProgressDom() {
  document.body.innerHTML = `
    <span id="current-progress-number"></span><span id="current-progress-date"></span>
    <span id="last-report-number"></span><span id="last-report-meta"></span>
    <span id="contract-period-text"></span>
    <div id="contract-progress-fill"></div><div id="contract-timeline-track"></div>
    <div id="contract-timeline-detail" data-default-text="Tap a point"></div>
  `;
}

describe('contract progress UI helpers', () => {
  it('resets the visible contract progress fields', () => {
    mountContractProgressDom();
    resetContractProgressFields();

    expect(document.getElementById('current-progress-number')?.textContent).toBe('—');
    expect(document.getElementById('last-report-number')?.textContent).toBe('—');
    expect(document.getElementById('contract-period-text')?.textContent).toBe('Sin fechas configuradas');
    expect(document.getElementById('contract-progress-fill')?.style.width).toBe('0%');
  });

  it('renders summaries and interactive timeline points', () => {
    mountContractProgressDom();
    renderContractProgressResult({
      currentPercentage: 48.4,
      currentDateText: 'Al 03/03/2027',
      lastReportPercentage: 40.2,
      lastReportText: '28/02/2027 · Informe 3 de 5',
      periodText: '01/12/2026 → 03/04/2027',
      timelinePoints: [{
        shortDateText: '28 feb', tooltipText: 'Informe 3 de 5 · 40,2 %', percentage: 40.2, position: 50, isPast: true, isToday: false,
      }],
      todayPoint: {
        shortDateText: 'Hoy', tooltipText: 'Avance actual · 48,4 %', percentage: 48.4, position: 58, isPast: true, isToday: true,
      },
    });

    expect(document.getElementById('current-progress-number')?.textContent).toBe('48.4');
    expect(document.getElementById('last-report-number')?.textContent).toBe('40.2');
    expect(document.querySelectorAll('.contract-timeline-point')).toHaveLength(2);
    expect(document.querySelector('.contract-timeline-today')?.getAttribute('aria-label')).toContain('48,4 %');
    (document.querySelector('.contract-timeline-today') as HTMLButtonElement).click();
    expect(document.getElementById('contract-timeline-detail')?.textContent).toContain('48,4 %');
  });
});
