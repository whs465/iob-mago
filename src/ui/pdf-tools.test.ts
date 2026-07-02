// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { getCheckboxValue, getTrimmedInputValue, updateSourceToolStatuses } from './pdf-tools';

function makeFile(name: string) {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

function appendStatusElements() {
  document.body.innerHTML = `
    <div id="merge-card"><button id="merge-action"></button><div id="merge-status"></div></div>
    <div id="split-card"><button id="split-action"></button><div id="split-status"></div></div>
    <div id="extract-card"><button id="extract-action"></button><div id="extract-status"></div></div>
    <div id="delete-card"><button id="delete-action"></button><div id="delete-status"></div></div>
    <div id="order-card"><button id="order-action"></button><div id="order-file-name"></div></div>
    <div id="rotate-card"><button id="rotate-action"></button><div id="rotate-status"></div></div>
  `;
}

describe('pdf tool DOM helpers', () => {
  it('reads checkbox and trimmed input values safely', () => {
    document.body.innerHTML = `
      <input id="flag" type="checkbox" checked>
      <input id="range" value=" 1, 3-5 ">
    `;

    expect(getCheckboxValue('flag')).toBe(true);
    expect(getCheckboxValue('missing')).toBe(false);
    expect(getTrimmedInputValue('range')).toBe('1, 3-5');
    expect(getTrimmedInputValue('missing')).toBe('');
  });

  it('writes no-file status to every source-dependent tool', () => {
    appendStatusElements();

    updateSourceToolStatuses([], {
      noFile: 'Load PDFs first',
      mergeLoaded: count => `${count} loaded`,
    });

    expect([
      document.getElementById('merge-status')?.textContent,
      document.getElementById('split-status')?.textContent,
      document.getElementById('extract-status')?.textContent,
      document.getElementById('delete-status')?.textContent,
      document.getElementById('order-file-name')?.textContent,
      document.getElementById('rotate-status')?.textContent,
    ]).toEqual([
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
    ]);
    expect(document.getElementById('merge-card')?.classList.contains('tool-card-disabled')).toBe(true);
    expect((document.getElementById('merge-action') as HTMLButtonElement).disabled).toBe(true);
  });

  it('writes the merge count and first file name when files are loaded', () => {
    appendStatusElements();

    updateSourceToolStatuses([makeFile('first.pdf'), makeFile('second.pdf')], {
      noFile: 'Load PDFs first',
      mergeLoaded: count => `${count} loaded`,
    });

    expect(document.getElementById('merge-status')?.textContent).toBe('2 loaded');
    expect(document.getElementById('split-status')?.textContent).toBe('first.pdf');
    expect(document.getElementById('order-file-name')?.textContent).toBe('first.pdf');
    expect(document.getElementById('merge-card')?.classList.contains('tool-card-ready')).toBe(true);
    expect((document.getElementById('merge-action') as HTMLButtonElement).disabled).toBe(false);
  });
});
