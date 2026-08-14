export function fileMatchesAccept(file: File, accept: string) {
  const rules = accept
    .split(',')
    .map(rule => rule.trim().toLowerCase())
    .filter(Boolean);

  if (rules.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  return rules.some(rule => {
    if (rule.startsWith('.')) return fileName.endsWith(rule);
    if (rule.endsWith('/*')) return mimeType.startsWith(rule.slice(0, -1));
    return mimeType === rule;
  });
}

export function getDroppedFiles(dataTransfer: DataTransfer | null | undefined) {
  const itemFiles = Array.from(dataTransfer?.items || [])
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null);

  return itemFiles.length > 0
    ? itemFiles
    : Array.from(dataTransfer?.files || []);
}

export function initFileInputDragDrop() {
  document.querySelectorAll<HTMLElement>('.file-input-wrapper').forEach(wrapper => {
    const label = wrapper.querySelector<HTMLElement>('.file-input-label');
    const input = wrapper.querySelector<HTMLInputElement>('input[type="file"]');
    if (!label || !input) return;

    wrapper.addEventListener('dragover', event => {
      event.preventDefault();
      label.classList.add('drag-over');
    });

    wrapper.addEventListener('dragleave', event => {
      if (!wrapper.contains(event.relatedTarget as Node | null)) {
        label.classList.remove('drag-over');
      }
    });

    wrapper.addEventListener('drop', event => {
      event.preventDefault();
      label.classList.remove('drag-over');

      const files = getDroppedFiles(event.dataTransfer);
      if (files.length === 0) return;

      const acceptedFiles = files.filter(file => fileMatchesAccept(file, input.accept));
      const rejectedFiles = files.filter(file => !fileMatchesAccept(file, input.accept));

      if (rejectedFiles.length > 0) {
        input.dispatchEvent(new CustomEvent('filesrejected', {
          detail: { files: rejectedFiles },
        }));
      }
      if (acceptedFiles.length === 0) return;

      const shouldContinueWithInput = input.dispatchEvent(new CustomEvent('filesdropped', {
        cancelable: true,
        detail: { files: acceptedFiles },
      }));
      if (!shouldContinueWithInput) return;

      try {
        const dataTransfer = new DataTransfer();
        acceptedFiles.forEach(file => dataTransfer.items.add(file));
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      } catch (error) {
        // Some browsers do not allow programmatic DataTransfer updates.
      }
    });
  });
}
