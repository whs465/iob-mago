// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fileMatchesAccept, getDroppedFiles, initFileInputDragDrop } from './file-drag-drop';

describe('initFileInputDragDrop', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="file-input-wrapper">
        <label class="file-input-label">
          <input id="file-input" type="file" />
        </label>
      </div>
    `;
  });

  it('marks the label while a file is dragged over it', () => {
    initFileInputDragDrop();
    const wrapper = document.querySelector<HTMLElement>('.file-input-wrapper') as HTMLElement;
    const label = document.querySelector<HTMLElement>('.file-input-label') as HTMLElement;

    wrapper.dispatchEvent(new Event('dragover', { bubbles: true }));
    expect(label.classList.contains('drag-over')).toBe(true);

    const dragLeave = new Event('dragleave', { bubbles: true });
    Object.defineProperty(dragLeave, 'relatedTarget', { value: document.body });
    wrapper.dispatchEvent(dragLeave);
    expect(label.classList.contains('drag-over')).toBe(false);
  });

  it('clears drag state after dropped files even when DataTransfer assignment is unavailable', () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    const changeListener = vi.fn();
    const input = document.getElementById('file-input') as HTMLInputElement;
    input.addEventListener('change', changeListener);

    initFileInputDragDrop();
    const wrapper = document.querySelector<HTMLElement>('.file-input-wrapper') as HTMLElement;
    const label = document.querySelector<HTMLElement>('.file-input-label') as HTMLElement;
    label.classList.add('drag-over');

    const drop = new Event('drop', { bubbles: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
    wrapper.dispatchEvent(drop);

    expect(label.classList.contains('drag-over')).toBe(false);
    expect(changeListener).not.toHaveBeenCalled();
  });

  it('rejects non-PDF files dropped on a PDF input', () => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    input.accept = '.pdf';
    const rejectionListener = vi.fn();
    const changeListener = vi.fn();
    input.addEventListener('filesrejected', rejectionListener);
    input.addEventListener('change', changeListener);

    initFileInputDragDrop();
    const wrapper = document.querySelector<HTMLElement>('.file-input-wrapper') as HTMLElement;
    const drop = new Event('drop', { bubbles: true });
    const image = new File(['image'], 'signature.png', { type: 'image/png' });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [image] } });
    wrapper.dispatchEvent(drop);

    expect(rejectionListener).toHaveBeenCalledTimes(1);
    expect(changeListener).not.toHaveBeenCalled();
  });

  it('preserves DataTransfer item order and passes it directly to a drop consumer', () => {
    const first = new File(['1'], '01-first.pdf', { type: 'application/pdf' });
    const second = new File(['2'], '02-second.pdf', { type: 'application/pdf' });
    const input = document.getElementById('file-input') as HTMLInputElement;
    input.accept = '.pdf';
    const received: File[][] = [];
    input.addEventListener('filesdropped', event => {
      received.push((event as CustomEvent<{ files: File[] }>).detail.files);
      event.preventDefault();
    });

    initFileInputDragDrop();
    const drop = new Event('drop', { bubbles: true });
    Object.defineProperty(drop, 'dataTransfer', { value: {
      files: [second, first],
      items: [
        { kind: 'file', getAsFile: () => first },
        { kind: 'file', getAsFile: () => second },
      ],
    } });
    document.querySelector<HTMLElement>('.file-input-wrapper')?.dispatchEvent(drop);

    expect(received).toEqual([[first, second]]);
  });
});

describe('fileMatchesAccept', () => {
  it('matches extensions case-insensitively', () => {
    expect(fileMatchesAccept(new File(['pdf'], 'CONTRACT.PDF'), '.pdf')).toBe(true);
    expect(fileMatchesAccept(new File(['image'], 'contract.png'), '.pdf')).toBe(false);
  });

  it('supports exact and wildcard MIME rules for image inputs', () => {
    const jpeg = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
    expect(fileMatchesAccept(jpeg, 'image/png,image/jpeg')).toBe(true);
    expect(fileMatchesAccept(jpeg, 'image/*')).toBe(true);
  });
});

describe('getDroppedFiles', () => {
  it('falls back to FileList order when drag items are unavailable', () => {
    const first = new File(['1'], 'first.pdf');
    const second = new File(['2'], 'second.pdf');
    expect(getDroppedFiles({ files: [first, second] } as unknown as DataTransfer)).toEqual([first, second]);
  });
});
