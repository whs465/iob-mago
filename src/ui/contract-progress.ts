import { getRequiredElement } from './dom';

export type ContractProgressResult = {
  startText: string;
  endText: string;
  reportText: string;
  percentage: number;
};

export function resetContractProgressFields() {
  getRequiredElement('porcentaje-numero').textContent = '—';
  getRequiredElement('fecha-inicio-txt').textContent = '—';
  getRequiredElement('fecha-fin-txt').textContent = '—';
  getRequiredElement('informe-periodo').textContent = '—';

  const progress = getRequiredElement('barra-progreso');
  progress.style.width = '0%';
  progress.setAttribute('aria-valuenow', '0');
}

export function renderContractProgressResult(result: ContractProgressResult) {
  getRequiredElement('fecha-inicio-txt').textContent = result.startText;
  getRequiredElement('fecha-fin-txt').textContent = result.endText;
  getRequiredElement('informe-periodo').textContent = result.reportText;
  getRequiredElement('porcentaje-numero').textContent = result.percentage.toFixed(1);

  const progress = getRequiredElement('barra-progreso');
  progress.style.width = `${result.percentage}%`;
  progress.setAttribute('aria-valuenow', result.percentage.toFixed(0));
}
