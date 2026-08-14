import {
  FileCog,
  FileMinus,
  FileOutput,
  ListOrdered,
  LockOpen,
  Merge,
  Minimize2,
  RotateCw,
  Split,
  Stamp,
  createElement,
  type IconNode,
} from 'lucide';

const operationIcons: Record<string, IconNode> = {
  'pdf-tool-merge': Merge,
  'pdf-tool-split': Split,
  'pdf-tool-extract': FileOutput,
  'pdf-tool-delete': FileMinus,
  'pdf-tool-order': ListOrdered,
  'pdf-tool-rotate': RotateCw,
  'pdf-tool-compress': Minimize2,
  'pdf-tool-unlock': LockOpen,
  'pdf-tool-watermark': Stamp,
  'pdf-tool-metadata': FileCog,
};

export function renderPdfToolIcons(root: ParentNode = document) {
  Object.entries(operationIcons).forEach(([id, icon]) => {
    const button = root.querySelector<HTMLButtonElement>(`#${id}`);
    if (!button || button.querySelector('.pdf-operation-icon')) return;

    const label = button.textContent?.trim() || '';
    const svg = createElement(icon, {
      class: 'pdf-operation-icon',
      width: 17,
      height: 17,
      'stroke-width': 1.9,
      'aria-hidden': 'true',
    });
    const text = document.createElement('span');
    text.className = 'pdf-operation-label';
    text.textContent = label;
    button.replaceChildren(svg, text);
  });
}
