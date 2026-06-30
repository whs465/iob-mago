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

    buttons[3].click();
    buttons[5].click();

    expect(onMove).toHaveBeenCalledWith(1, 0);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
