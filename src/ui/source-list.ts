export type SourceListLabels = {
  moveUp: string;
  moveDown: string;
  remove: string;
};

export type SourceListCallbacks = {
  onMove(fromIndex: number | null, toIndex: number): void;
  onRemove(index: number): void;
};

export function createFileActionButton(
  text: string,
  label: string,
  disabled: boolean,
  onClick: () => void,
  extraClass = '',
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `file-action ${extraClass}`.trim();
  button.textContent = text;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.disabled = disabled;
  button.addEventListener('click', event => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

export function renderSourceFileList(
  list: HTMLElement,
  files: File[],
  labels: SourceListLabels,
  callbacks: SourceListCallbacks,
) {
  list.innerHTML = '';
  let draggedSourceIndex: number | null = null;

  files.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.draggable = true;
    item.dataset.index = String(index);

    item.addEventListener('dragstart', event => {
      draggedSourceIndex = index;
      item.classList.add('dragging');
      event.dataTransfer?.setData('text/plain', String(index));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      draggedSourceIndex = null;
      item.classList.remove('dragging');
      document.querySelectorAll('#source-list .drag-over').forEach(el => {
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
      const fromIndex = dragData === '' ? draggedSourceIndex : Number(dragData);
      callbacks.onMove(fromIndex, index);
    });

    const main = document.createElement('div');
    main.className = 'file-main';

    const order = document.createElement('span');
    order.className = 'file-order-index';
    order.textContent = String(index + 1);

    const name = document.createElement('span');
    name.className = 'file-name';
    name.title = file.name;
    name.textContent = file.name;

    main.append(order, name);

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    actions.append(
      createFileActionButton('↑', labels.moveUp, index === 0, () => callbacks.onMove(index, index - 1)),
      createFileActionButton('↓', labels.moveDown, index === files.length - 1, () => callbacks.onMove(index, index + 1)),
      createFileActionButton('✕', labels.remove, false, () => callbacks.onRemove(index), 'remove'),
    );

    item.append(main, actions);
    list.appendChild(item);
  });
}
