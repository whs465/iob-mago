// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createFileActionButton, renderSourceFileList } from './source-list';

function makeFile(name: string) {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

describe('source-list ui helpers', () => {
  it('creates file action buttons that stop propagation and call the action', () => {
    const onClick = vi.fn();
    const parentClick = vi.fn();
    const parent = document.createElement('div');
    const button = createFileActionButton('↑', 'Move up', false, onClick);

    parent.addEventListener('click', parentClick);
    parent.appendChild(button);
    button.click();

    expect(onClick).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-label')).toBe('Move up');
  });

  it('renders source files with order, names and actions', () => {
    const list = document.createElement('div');
    const onMove = vi.fn();
    const onRemove = vi.fn();

    renderSourceFileList(
      list,
      [makeFile('a.pdf'), makeFile('b.pdf')],
      { moveUp: 'Move up', moveDown: 'Move down', remove: 'Remove' },
      { onMove, onRemove },
    );

    expect(list.querySelectorAll('.file-item')).toHaveLength(2);
    expect(list.querySelector('.file-order-index')?.textContent).toBe('1');
    expect(list.querySelector('.file-name')?.textContent).toBe('a.pdf');

    const buttons = list.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[3].disabled).toBe(false);
    expect(list.querySelectorAll('.file-move-actions')).toHaveLength(2);
    expect(buttons[0].querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(buttons[5].classList.contains('remove')).toBe(true);

    buttons[3].click();
    buttons[5].click();

    expect(onMove).toHaveBeenCalledWith(1, 0);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('keeps a long filename in a dedicated truncatable element', () => {
    const list = document.createElement('div');
    const longName = `${'informe-mensual-con-anexos-y-soportes-'.repeat(8)}.pdf`;

    renderSourceFileList(
      list,
      [makeFile(longName)],
      { moveUp: 'Move up', moveDown: 'Move down', remove: 'Remove' },
      { onMove: vi.fn(), onRemove: vi.fn() },
    );

    const main = list.querySelector('.file-main');
    const name = list.querySelector('.file-name');
    expect(main?.children).toHaveLength(2);
    expect(name?.textContent).toBe(longName);
    expect(name?.getAttribute('title')).toBe(longName);
  });
});
