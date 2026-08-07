export type StatusType = 'success' | 'error' | 'processing' | string;

let statusTimer: ReturnType<typeof setTimeout> | null = null;

export function getElement<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T | null;
}

export function getRequiredElement<T extends HTMLElement = HTMLElement>(id: string) {
  const element = getElement<T>(id);
  if (!element) throw new Error(`Missing required element: #${id}`);
  return element;
}

export function getInputElement(id: string) {
  return getRequiredElement<HTMLInputElement>(id);
}

export function getInputValue(id: string) {
  return getInputElement(id).value;
}

export function setInputValue(id: string, value: string) {
  getInputElement(id).value = value;
}

export function updateFileInputLabel(
  labelId: string,
  inputId: string,
  text: string,
  hasFiles = false,
) {
  const label = getElement<HTMLLabelElement>(labelId);
  const input = label?.querySelector<HTMLInputElement>('input[type="file"]') || getElement<HTMLInputElement>(inputId);
  if (!label) return;

  const textTarget = label.querySelector<HTMLElement>('[data-file-label-text]');
  if (textTarget) {
    textTarget.textContent = text;
  } else {
    label.textContent = text;
  }
  label.classList.toggle('has-files', hasFiles);
  if (input && !label.contains(input)) {
    label.appendChild(input);
  }
}

export function showStatus(message: string, type: StatusType) {
  const el = getRequiredElement('status');
  el.className = `status ${type}`;
  el.textContent = message;

  if (statusTimer) clearTimeout(statusTimer);
  if (type === 'success') {
    statusTimer = setTimeout(() => {
      el.className = 'status';
    }, 5000);
  }
}

export function setActionBusy(buttonId: string, busyText: string) {
  const button = getElement<HTMLButtonElement>(buttonId);
  if (!button) return () => {};
  if (button.disabled) return null;

  button.dataset.originalText = button.textContent?.trim() || '';
  button.textContent = busyText;
  button.disabled = true;
  button.classList.add('is-processing');
  button.setAttribute('aria-busy', 'true');

  return () => {
    button.textContent = button.dataset.originalText || '';
    delete button.dataset.originalText;
    button.disabled = false;
    button.classList.remove('is-processing');
    button.removeAttribute('aria-busy');
  };
}
