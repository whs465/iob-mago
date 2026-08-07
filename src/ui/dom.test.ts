// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getElement,
  getInputElement,
  getInputValue,
  getRequiredElement,
  setActionBusy,
  setInputValue,
  showStatus,
  updateFileInputLabel,
} from './dom';

describe('dom helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('returns nullable and required elements by id', () => {
    document.body.innerHTML = '<div id="target"></div>';

    expect(getElement('target')).toBeInstanceOf(HTMLDivElement);
    expect(getElement('missing')).toBeNull();
    expect(getRequiredElement('target')).toBeInstanceOf(HTMLDivElement);
    expect(() => getRequiredElement('missing')).toThrow('Missing required element: #missing');
  });

  it('updates a file input label without losing the input', () => {
    document.body.innerHTML = `
      <label id="source-label"><input id="source-input" type="file"></label>
    `;

    updateFileInputLabel('source-label', 'source-input', '2 files', true);

    const label = getRequiredElement<HTMLLabelElement>('source-label');
    expect(label.textContent).toBe('2 files');
    expect(label.classList.contains('has-files')).toBe(true);
    expect(label.querySelector('#source-input')).toBeInstanceOf(HTMLInputElement);
  });

  it('preserves structured dropzone content while updating its main text', () => {
    document.body.innerHTML = `
      <label id="source-label">
        <span class="file-dropzone-icon">icon</span>
        <strong data-file-label-text>Select files</strong>
        <span class="file-dropzone-help">PDF only</span>
        <input id="source-input" type="file">
      </label>`;

    updateFileInputLabel('source-label', 'source-input', '2 files selected', true);

    const label = getRequiredElement('source-label');
    expect(label.querySelector('[data-file-label-text]')?.textContent).toBe('2 files selected');
    expect(label.querySelector('.file-dropzone-icon')?.textContent).toBe('icon');
    expect(label.querySelector('.file-dropzone-help')?.textContent).toBe('PDF only');
    expect(label.querySelector('#source-input')).toBeInstanceOf(HTMLInputElement);
  });

  it('reads and writes input values by id', () => {
    document.body.innerHTML = '<input id="name" value="old">';

    expect(getInputElement('name')).toBeInstanceOf(HTMLInputElement);
    expect(getInputValue('name')).toBe('old');

    setInputValue('name', 'new');

    expect(getInputValue('name')).toBe('new');
  });

  it('shows status and clears success styling after timeout', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="status"></div>';

    showStatus('Done', 'success');

    const status = getRequiredElement('status');
    expect(status.textContent).toBe('Done');
    expect(status.className).toBe('status success');

    vi.advanceTimersByTime(5000);
    expect(status.className).toBe('status');
  });

  it('marks a button busy and restores it', () => {
    document.body.innerHTML = '<button id="action">Run</button>';

    const finish = setActionBusy('action', 'Running...');
    const button = getRequiredElement<HTMLButtonElement>('action');

    expect(finish).toBeTypeOf('function');
    expect(button.textContent).toBe('Running...');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');

    finish?.();
    expect(button.textContent).toBe('Run');
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });
});
