// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { renderOrderPageList, renderOrderPageListWithI18n } from './order-list';

describe('order-list ui helpers', () => {
  it('clears the list when there are no pages', () => {
    const list = document.createElement('div');
    list.innerHTML = '<div>old</div>';

    renderOrderPageList(
      list,
      [],
      { originalPage: page => `Original page ${page}`, moveUp: 'Up', moveDown: 'Down' },
      { onMove: vi.fn() },
    );

    expect(list.innerHTML).toBe('');
  });

  it('renders reorderable pages with labels and move actions', () => {
    const list = document.createElement('div');
    const onMove = vi.fn();

    renderOrderPageList(
      list,
      [{ originalIndex: 2 }, { originalIndex: 0 }],
      { originalPage: page => `Original page ${page}`, moveUp: 'Up', moveDown: 'Down' },
      { onMove },
    );

    expect(list.querySelectorAll('.file-item')).toHaveLength(2);
    expect(list.querySelector('.file-order-index')?.textContent).toBe('1');
    expect(list.querySelector('.file-name')?.textContent).toBe('Original page 3');

    const buttons = list.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[3].disabled).toBe(true);

    buttons[1].click();
    buttons[2].click();

    expect(onMove).toHaveBeenCalledWith(0, 1);
    expect(onMove).toHaveBeenCalledWith(1, 0);
  });

  it('renderOrderPageListWithI18n reads list from DOM and delegates to renderOrderPageList', () => {
    const list = document.createElement('div');
    list.id = 'order-list';
    document.body.appendChild(list);

    const onMove = vi.fn();
    const i18n = (en: string, _es: string, values?: Record<string, string>) =>
      values ? Object.entries(values).reduce((t, [k, v]) => t.replace(`{{${k}}}`, v), en) : en;

    renderOrderPageListWithI18n(
      [{ originalIndex: 1 }],
      i18n,
      onMove,
    );

    expect(list.querySelectorAll('.file-item')).toHaveLength(1);
    expect(list.querySelector('.file-name')?.textContent).toBe('Original page 2');

    document.body.removeChild(list);
  });
});
