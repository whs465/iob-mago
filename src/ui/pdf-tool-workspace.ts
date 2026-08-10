export type PdfToolCategory = 'files' | 'pages' | 'document';

type CategoryButton = HTMLButtonElement & { dataset: DOMStringMap & { pdfCategory?: string } };
type ToolButton = HTMLButtonElement & {
  dataset: DOMStringMap & { pdfCategory?: string; pdfTool?: string };
};

export function setupPdfToolWorkspace(root: ParentNode = document) {
  const workspace = root.querySelector<HTMLElement>('#pdf-workspace');
  if (!workspace) return () => undefined;

  const categoryButtons = Array.from(
    workspace.querySelectorAll<CategoryButton>('[data-pdf-category][role="tab"]'),
  );
  const categoryTabs = workspace.querySelector<HTMLElement>('.pdf-category-tabs');
  const toolButtons = Array.from(
    workspace.querySelectorAll<ToolButton>('[data-pdf-tool]'),
  );
  const operationNav = workspace.querySelector<HTMLElement>('.pdf-operation-nav');
  const panels = Array.from(workspace.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const lastToolByCategory = new Map<PdfToolCategory, string>();
  const cleanups: Array<() => void> = [];

  const isCategory = (value?: string): value is PdfToolCategory =>
    value === 'files' || value === 'pages' || value === 'document';

  function updateToolIndicator(button: ToolButton) {
    if (!operationNav) return;
    operationNav.dataset.activeTool = button.dataset.pdfTool || '';
    operationNav.style.setProperty('--pdf-operation-indicator-left', `${button.offsetLeft}px`);
    operationNav.style.setProperty('--pdf-operation-indicator-width', `${button.offsetWidth}px`);
    operationNav.dataset.indicatorReady = String(button.offsetWidth > 0);
  }

  function scheduleToolIndicator(button: ToolButton) {
    updateToolIndicator(button);
    workspace.ownerDocument.defaultView?.requestAnimationFrame(() => updateToolIndicator(button));
  }

  function selectTool(toolId: string) {
    const selected = toolButtons.find((button) => button.dataset.pdfTool === toolId);
    if (!selected || !isCategory(selected.dataset.pdfCategory)) return;

    lastToolByCategory.set(selected.dataset.pdfCategory, toolId);
    toolButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button === selected));
    });
    scheduleToolIndicator(selected);
    panels.forEach((panel) => {
      panel.hidden = panel.id !== toolId;
    });
  }

  function selectCategory(category: PdfToolCategory) {
    if (categoryTabs) categoryTabs.dataset.activeCategory = category;
    categoryButtons.forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.pdfCategory === category));
    });

    const availableTools = toolButtons.filter((button) => button.dataset.pdfCategory === category);
    toolButtons.forEach((button) => {
      button.hidden = button.dataset.pdfCategory !== category;
    });

    const rememberedTool = lastToolByCategory.get(category);
    const nextTool = availableTools.find((button) => button.dataset.pdfTool === rememberedTool)
      ?? availableTools[0];
    if (nextTool?.dataset.pdfTool) selectTool(nextTool.dataset.pdfTool);
  }

  categoryButtons.forEach((button, index) => {
    const onClick = () => {
      if (isCategory(button.dataset.pdfCategory)) selectCategory(button.dataset.pdfCategory);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + categoryButtons.length) % categoryButtons.length;
      categoryButtons[nextIndex].focus();
      categoryButtons[nextIndex].click();
    };
    button.addEventListener('click', onClick);
    button.addEventListener('keydown', onKeyDown);
    cleanups.push(() => button.removeEventListener('click', onClick));
    cleanups.push(() => button.removeEventListener('keydown', onKeyDown));
  });

  toolButtons.forEach((button) => {
    const onClick = () => {
      if (button.dataset.pdfTool) selectTool(button.dataset.pdfTool);
    };
    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  });

  const onResize = () => {
    const activeButton = toolButtons.find((button) => button.getAttribute('aria-pressed') === 'true');
    if (activeButton) updateToolIndicator(activeButton);
  };
  workspace.ownerDocument.defaultView?.addEventListener('resize', onResize);
  cleanups.push(() => workspace.ownerDocument.defaultView?.removeEventListener('resize', onResize));

  const initialCategory = categoryButtons.find(
    (button) => button.getAttribute('aria-selected') === 'true' && isCategory(button.dataset.pdfCategory),
  )?.dataset.pdfCategory;
  selectCategory(isCategory(initialCategory) ? initialCategory : 'files');

  return () => cleanups.forEach((cleanup) => cleanup());
}
