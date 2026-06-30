import { createFileActionButton } from './source-list';

export type OrderPage = {
  originalIndex: number;
};

export type OrderListLabels = {
  originalPage(pageNumber: number): string;
  moveUp: string;
  moveDown: string;
};

export type OrderListCallbacks = {
  onMove(fromIndex: number | null, toIndex: number): void;
};

type OrderListTranslator = (
  english: string,
  spanish: string,
  values?: Record<string, string>,
) => string;

/**
 * Convenience wrapper that calls renderOrderPageList with i18n label generation
 * and reads the list element from the DOM by id.
 */
export function renderOrderPageListWithI18n(
  pages: OrderPage[],
  i18n: OrderListTranslator,
  onMove: (fromIndex: number | null, toIndex: number) => void,
) {
  const list = document.getElementById('order-list');
  if (!list) return;
  renderOrderPageList(
    list,
    pages,
    {
      originalPage: page => i18n('Original page {{page}}', 'Página original {{page}}', { page: String(page) }),
      moveUp: i18n('Move page up', 'Subir página'),
      moveDown: i18n('Move page down', 'Bajar página'),
    },
    { onMove },
  );
}

export function renderOrderPageList(
  list: HTMLElement,
  pages: OrderPage[],
  labels: OrderListLabels,
  callbacks: OrderListCallbacks,
) {
  list.innerHTML = '';
  if (pages.length === 0) return;

  let draggedOrderIndex: number | null = null;

  pages.forEach((page, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.draggable = true;
    item.dataset.index = String(index);

    item.addEventListener('dragstart', event => {
      draggedOrderIndex = index;
      item.classList.add('dragging');
      event.dataTransfer?.setData('text/plain', String(index));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      draggedOrderIndex = null;
      item.classList.remove('dragging');
      document.querySelectorAll('#order-list .drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });

    item.addEventListener('dragover', event => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', event => {
      event.preventDefault();
      item.classList.remove('drag-over');
      const dragData = event.dataTransfer?.getData('text/plain') ?? '';
      const fromIndex = dragData === '' ? draggedOrderIndex : Number(dragData);
      callbacks.onMove(fromIndex, index);
    });

    const main = document.createElement('div');
    main.className = 'file-main';

    const order = document.createElement('span');
    order.className = 'file-order-index';
    order.textContent = String(index + 1);

    const name = document.createElement('span');
    name.className = 'file-name';
    name.title = labels.originalPage(page.originalIndex + 1);
    name.textContent = labels.originalPage(page.originalIndex + 1);

    main.append(order, name);

    const actions = document.createElement('div');
    actions.className = 'file-actions';
    actions.append(
      createFileActionButton('↑', labels.moveUp, index === 0, () => callbacks.onMove(index, index - 1)),
      createFileActionButton('↓', labels.moveDown, index === pages.length - 1, () => callbacks.onMove(index, index + 1)),
    );

    item.append(main, actions);
    list.appendChild(item);
  });
}
