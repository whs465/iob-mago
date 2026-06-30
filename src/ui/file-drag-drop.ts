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

      const files = event.dataTransfer?.files;
      if (!files?.length) return;

      try {
        const dataTransfer = new DataTransfer();
        Array.from(files).forEach(file => dataTransfer.items.add(file));
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      } catch (error) {
        // Some browsers do not allow programmatic DataTransfer updates.
      }
    });
  });
}
