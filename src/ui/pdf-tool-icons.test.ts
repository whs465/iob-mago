// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderPdfToolIcons } from './pdf-tool-icons';

describe('renderPdfToolIcons', () => {
  it('adds accessible decorative icons without changing labels', () => {
    document.body.innerHTML = `
      <nav>
        <button id="pdf-tool-merge">Unir</button>
        <button id="pdf-tool-compress">Comprimir</button>
      </nav>
    `;

    renderPdfToolIcons();

    expect(document.querySelector('#pdf-tool-merge .pdf-operation-label')?.textContent).toBe('Unir');
    expect(document.querySelector('#pdf-tool-compress svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.getElementById('pdf-tool-merge')?.textContent).toBe('Unir');
  });

  it('is idempotent', () => {
    document.body.innerHTML = '<button id="pdf-tool-rotate">Girar</button>';
    renderPdfToolIcons();
    renderPdfToolIcons();
    expect(document.querySelectorAll('#pdf-tool-rotate svg')).toHaveLength(1);
  });
});
