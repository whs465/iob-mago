// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { setupPdfToolWorkspace } from './pdf-tool-workspace';

describe('setupPdfToolWorkspace', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="pdf-workspace">
        <button role="tab" data-pdf-category="files" aria-selected="true">Files</button>
        <button role="tab" data-pdf-category="pages" aria-selected="false">Pages</button>
        <button role="tab" data-pdf-category="document" aria-selected="false">Document</button>
        <button data-pdf-tool="merge-card" data-pdf-category="files">Merge</button>
        <button data-pdf-tool="split-card" data-pdf-category="files">Split</button>
        <button data-pdf-tool="extract-card" data-pdf-category="pages">Extract</button>
        <button data-pdf-tool="delete-card" data-pdf-category="pages">Delete</button>
        <button data-pdf-tool="compress-card" data-pdf-category="document">Compress</button>
        <section id="merge-card" role="tabpanel"></section>
        <section id="split-card" role="tabpanel"></section>
        <section id="extract-card" role="tabpanel"></section>
        <section id="delete-card" role="tabpanel"></section>
        <section id="compress-card" role="tabpanel"></section>
      </div>
    `;
  });

  it('starts with the first operation in the selected category', () => {
    setupPdfToolWorkspace();

    expect(document.querySelector<HTMLElement>('#merge-card')?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#split-card')?.hidden).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[data-pdf-tool="extract-card"]')?.hidden).toBe(true);
  });

  it('changes category and operation while keeping only one panel visible', () => {
    setupPdfToolWorkspace();

    document.querySelector<HTMLButtonElement>('[role="tab"][data-pdf-category="pages"]')?.click();
    expect(document.querySelector<HTMLElement>('#extract-card')?.hidden).toBe(false);

    document.querySelector<HTMLButtonElement>('[data-pdf-tool="delete-card"]')?.click();
    expect(document.querySelector<HTMLElement>('#delete-card')?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#extract-card')?.hidden).toBe(true);
  });

  it('remembers the last operation selected in each category', () => {
    setupPdfToolWorkspace();

    document.querySelector<HTMLButtonElement>('[role="tab"][data-pdf-category="pages"]')?.click();
    document.querySelector<HTMLButtonElement>('[data-pdf-tool="delete-card"]')?.click();
    document.querySelector<HTMLButtonElement>('[role="tab"][data-pdf-category="files"]')?.click();
    document.querySelector<HTMLButtonElement>('[role="tab"][data-pdf-category="pages"]')?.click();

    expect(document.querySelector<HTMLElement>('#delete-card')?.hidden).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('[data-pdf-tool="delete-card"]')?.getAttribute('aria-pressed')).toBe('true');
  });
});
