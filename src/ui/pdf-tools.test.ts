// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { getCheckboxValue, getTrimmedInputValue, updateSourceToolStatuses } from './pdf-tools';

function makeFile(name: string) {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

function appendStatusElements() {
  document.body.innerHTML = `
    <div id="merge-status"></div>
    <div id="split-status"></div>
    <div id="extract-status"></div>
    <div id="delete-status"></div>
    <div id="order-file-name"></div>
    <div id="rotate-status"></div>
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

    expect([...document.querySelectorAll('div')].map(element => element.textContent)).toEqual([
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
      'Load PDFs first',
    ]);
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
  });
});
