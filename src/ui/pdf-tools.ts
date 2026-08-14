import { getElement } from './dom';

export type SourceToolStatusLabels = {
  noFile: string;
  mergeLoaded(count: number): string;
  batchLoaded?(count: number): string;
};

export function getCheckboxValue(id: string) {
  return getElement<HTMLInputElement>(id)?.checked ?? false;
}

export function getTrimmedInputValue(id: string) {
  return getElement<HTMLInputElement>(id)?.value.trim() ?? '';
}

export function updateSourceToolStatuses(files: File[], labels: SourceToolStatusLabels) {
  const mergeStatus = getElement('merge-status');
  const splitStatus = getElement('split-status');
  const extractStatus = getElement('extract-status');
  const deleteStatus = getElement('delete-status');
  const orderFileName = getElement('order-file-name');
  const rotateStatus = getElement('rotate-status');
  const compressStatus = getElement('compress-status');
  const unlockStatus = getElement('unlock-status');
  const watermarkStatus = getElement('watermark-status');
  const metadataStatus = getElement('metadata-status');
  const hasFiles = files.length > 0;

  [
    ['merge-card', 'merge-action'],
    ['split-card', 'split-action'],
    ['extract-card', 'extract-action'],
    ['delete-card', 'delete-action'],
    ['order-card', 'order-action'],
    ['rotate-card', 'rotate-action'],
    ['compress-card', 'compress-action'],
    ['unlock-card', 'unlock-action'],
    ['watermark-card', 'watermark-action'],
    ['metadata-card', 'metadata-load-action'],
  ].forEach(([cardId, buttonId]) => {
    const card = getElement(cardId);
    const button = getElement<HTMLButtonElement>(buttonId);

    if (card) {
      card.classList.toggle('tool-card-ready', hasFiles);
      card.classList.toggle('tool-card-disabled', !hasFiles);
    }

    if (button) {
      button.disabled = !hasFiles;
      button.setAttribute('aria-disabled', String(!hasFiles));
    }
  });

  if (!hasFiles) {
    [mergeStatus, splitStatus, extractStatus, deleteStatus, rotateStatus, compressStatus, unlockStatus, watermarkStatus, metadataStatus].forEach(element => {
      if (element) element.textContent = labels.noFile;
    });
    if (orderFileName) orderFileName.textContent = labels.noFile;
    return;
  }

  if (mergeStatus) mergeStatus.textContent = labels.mergeLoaded(files.length);

  const firstName = files[0].name;
  const batchName = files.length > 1 && labels.batchLoaded ? labels.batchLoaded(files.length) : firstName;
  if (splitStatus) splitStatus.textContent = firstName;
  if (extractStatus) extractStatus.textContent = firstName;
  if (deleteStatus) deleteStatus.textContent = firstName;
  if (orderFileName) orderFileName.textContent = firstName;
  if (rotateStatus) rotateStatus.textContent = batchName;
  if (compressStatus) compressStatus.textContent = batchName;
  if (unlockStatus) unlockStatus.textContent = batchName;
  if (watermarkStatus) watermarkStatus.textContent = batchName;
  if (metadataStatus) metadataStatus.textContent = firstName;
}
