// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderContractProgressResult, resetContractProgressFields } from './contract-progress';

function mountContractProgressDom() {
  document.body.innerHTML = `
    <span id="porcentaje-numero"></span>
    <span id="fecha-inicio-txt"></span>
    <span id="fecha-fin-txt"></span>
    <span id="informe-periodo"></span>
    <div id="barra-progreso"></div>
  `;
}

describe('contract progress UI helpers', () => {
  it('resets the visible contract progress fields', () => {
    mountContractProgressDom();

    renderContractProgressResult({
      startText: 'Jan 1, 2026',
      endText: 'Dec 31, 2026',
      reportText: 'Month 6 / 12',
      percentage: 50,
    });
    resetContractProgressFields();

    expect(document.getElementById('porcentaje-numero')?.textContent).toBe('—');
    expect(document.getElementById('fecha-inicio-txt')?.textContent).toBe('—');
    expect(document.getElementById('fecha-fin-txt')?.textContent).toBe('—');
    expect(document.getElementById('informe-periodo')?.textContent).toBe('—');
    expect(document.getElementById('barra-progreso')?.style.width).toBe('0%');
    expect(document.getElementById('barra-progreso')?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('renders the calculated contract progress result', () => {
    mountContractProgressDom();

    renderContractProgressResult({
      startText: 'Jan 1, 2026',
      endText: 'Dec 31, 2026',
      reportText: 'Month 6 / 12',
      percentage: 48.4,
    });

    expect(document.getElementById('fecha-inicio-txt')?.textContent).toBe('Jan 1, 2026');
    expect(document.getElementById('fecha-fin-txt')?.textContent).toBe('Dec 31, 2026');
    expect(document.getElementById('informe-periodo')?.textContent).toBe('Month 6 / 12');
    expect(document.getElementById('porcentaje-numero')?.textContent).toBe('48.4');
    expect(document.getElementById('barra-progreso')?.style.width).toBe('48.4%');
    expect(document.getElementById('barra-progreso')?.getAttribute('aria-valuenow')).toBe('48');
  });
});
