import { getElement } from './dom';

export type SourceToolStatusLabels = {
  noFile: string;
  mergeLoaded(count: number): string;
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

  if (files.length === 0) {
    [mergeStatus, splitStatus, extractStatus, deleteStatus, rotateStatus].forEach(element => {
      if (element) element.textContent = labels.noFile;
    });
    if (orderFileName) orderFileName.textContent = labels.noFile;
    return;
  }

  if (mergeStatus) mergeStatus.textContent = labels.mergeLoaded(files.length);

  const firstName = files[0].name;
  if (splitStatus) splitStatus.textContent = firstName;
  if (extractStatus) extractStatus.textContent = firstName;
  if (deleteStatus) deleteStatus.textContent = firstName;
  if (orderFileName) orderFileName.textContent = firstName;
  if (rotateStatus) rotateStatus.textContent = firstName;
}
