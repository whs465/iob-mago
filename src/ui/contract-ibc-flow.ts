import { Calculator, Check, Copy, createElement, type IconNode } from 'lucide';
import type { SignatureMetaTranslator } from './signature-preview';
import { getRequiredElement } from './dom';
import {
  calculateContractIbc,
  calculateSocialSecurityContributions,
  COLOMBIA_SMMLV_2026,
  type ArlRiskLevel,
  type SocialSecurityContributions,
} from '../utils/contract-ibc';

type ContractIbcFlowOptions = {
  i18n: SignatureMetaTranslator;
  copyText?: (text: string) => Promise<void>;
};

type StoredContractIbc = {
  monthlyIncome?: string;
  mode?: 'full-month' | 'days';
  startDate?: string;
  endDate?: string;
};

const STORAGE_KEY = 'contractIbcCalculator';

function renderIcon(element: HTMLElement, icon: IconNode, size = 17) {
  element.replaceChildren(createElement(icon, {
    width: size,
    height: size,
    'stroke-width': 2,
    'aria-hidden': 'true',
  }));
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function readPesoValue(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export function setupContractIbcFlow({
  i18n,
  copyText = copyTextToClipboard,
}: ContractIbcFlowOptions) {
  const locale = i18n('en-CO', 'es-CO');
  const pesoFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  const amountInput = getRequiredElement<HTMLInputElement>('ibc-monthly-income');
  const startInput = getRequiredElement<HTMLInputElement>('ibc-start-date');
  const endInput = getRequiredElement<HTMLInputElement>('ibc-end-date');
  const dayFields = getRequiredElement('ibc-day-fields');
  const resultValue = getRequiredElement('ibc-result-value');
  const resultDetail = getRequiredElement('ibc-result-detail');
  const resultNote = getRequiredElement('ibc-result-note');
  const copyButton = getRequiredElement<HTMLButtonElement>('ibc-copy');
  const modeInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="ibc-period-mode"]'));
  let currentIbc: number | null = null;

  renderIcon(getRequiredElement('ibc-heading-icon'), Calculator, 19);
  renderIcon(copyButton, Copy);

  function selectedMode() {
    return modeInputs.find(input => input.checked)?.value === 'days' ? 'days' : 'full-month';
  }

  function selectedArlRiskLevel(): ArlRiskLevel | null {
    return 1;
  }

  function formatRate(rate: number) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(rate * 100);
  }

  function renderContributions(contributions: SocialSecurityContributions | null) {
    const values = contributions || {
      health: 0,
      pension: 0,
      arl: 0,
      arlRate: 0.00522,
      total: 0,
    };
    getRequiredElement('ibc-health-value').textContent = pesoFormatter.format(values.health);
    getRequiredElement('ibc-pension-value').textContent = pesoFormatter.format(values.pension);
    getRequiredElement('ibc-arl-value').textContent = pesoFormatter.format(values.arl);
    getRequiredElement('ibc-total-value').textContent = pesoFormatter.format(values.total);
    getRequiredElement('ibc-arl-rate').textContent = `(${formatRate(values.arlRate)}%)`;
  }

  function storeValues() {
    const value: StoredContractIbc = {
      monthlyIncome: String(readPesoValue(amountInput.value) || ''),
      mode: selectedMode(),
      startDate: startInput.value,
      endDate: endInput.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function setEmptyResult(message = i18n('Enter the monthly contract value.', 'Ingresa el valor mensual del contrato.')) {
    currentIbc = null;
    resultValue.textContent = '—';
    resultDetail.textContent = message;
    resultNote.textContent = i18n(
      'The result is an estimate of the contribution base, not the final PILA payment.',
      'El resultado estima la base de cotización, no el valor final de la planilla PILA.',
    );
    renderContributions(null);
    copyButton.disabled = true;
  }

  function calculateAndRender() {
    const mode = selectedMode();
    const monthlyIncome = readPesoValue(amountInput.value);
    dayFields.toggleAttribute('hidden', mode !== 'days');
    storeValues();

    if (!monthlyIncome) {
      setEmptyResult();
      return;
    }
    if (mode === 'days' && (!startInput.value || !endInput.value)) {
      setEmptyResult(i18n('Select the first and last day to contribute.', 'Selecciona el primer y el último día a cotizar.'));
      return;
    }

    try {
      const result = calculateContractIbc(
        monthlyIncome,
        mode === 'days'
          ? { mode, startDate: startInput.value, endDate: endInput.value }
          : { mode },
      );
      currentIbc = result.ibc;
      const arlRiskLevel = selectedArlRiskLevel();
      const contributions = calculateSocialSecurityContributions(
        result.ibc,
        arlRiskLevel,
      );
      renderContributions(contributions);
      resultValue.textContent = pesoFormatter.format(result.ibc);
      resultDetail.textContent = mode === 'days'
        ? i18n(
          '{{income}} × 40% · {{days}} day(s) of 30',
          '{{income}} × 40% · {{days}} día(s) de 30',
          { income: pesoFormatter.format(monthlyIncome), days: String(result.days) },
        )
        : i18n(
          '{{income}} × 40% · full month',
          '{{income}} × 40% · mes completo',
          { income: pesoFormatter.format(monthlyIncome) },
        );
      const notes: string[] = [];
      if (result.adjustment === 'minimum') {
        notes.push(i18n(
          'Adjusted to the proportional 2026 minimum base (SMMLV: {{minimum}}).',
          'Ajustado a la base mínima proporcional de 2026 (SMMLV: {{minimum}}).',
          { minimum: pesoFormatter.format(COLOMBIA_SMMLV_2026) },
        ));
      } else if (result.adjustment === 'maximum') {
        notes.push(i18n(
          'Adjusted to the legal maximum of 25 monthly minimum salaries.',
          'Ajustado al tope legal de 25 salarios mínimos mensuales.',
        ));
      } else {
        notes.push(i18n(
          'Estimated payment; confirm the final value with your PILA operator.',
          'Pago estimado; confirma el valor final con tu operador PILA.',
        ));
      }
      if (arlRiskLevel === 4 || arlRiskLevel === 5) {
        notes.push(i18n(
          'For risk IV or V, verify whether the contracting party must pay the ARL contribution.',
          'Para riesgo IV o V, verifica si el aporte a ARL debe pagarlo el contratante.',
        ));
      }
      resultNote.textContent = notes.join(' ');
      copyButton.disabled = false;
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      setEmptyResult(reason === 'different-months'
        ? i18n('The dates must belong to the same contribution month.', 'Las fechas deben pertenecer al mismo mes de cotización.')
        : reason === 'invalid-range'
          ? i18n('The end date must be on or after the start date.', 'La fecha final debe ser igual o posterior a la inicial.')
          : i18n('Check the entered dates.', 'Revisa las fechas ingresadas.'));
    }
  }

  function restoreValues() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as StoredContractIbc;
      amountInput.value = stored.monthlyIncome || '';
      startInput.value = stored.startDate || '';
      endInput.value = stored.endDate || '';
      const mode = stored.mode === 'days' ? 'days' : 'full-month';
      modeInputs.forEach(input => { input.checked = input.value === mode; });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    calculateAndRender();
  }

  amountInput.addEventListener('input', calculateAndRender);
  amountInput.addEventListener('blur', () => {
    const value = readPesoValue(amountInput.value);
    amountInput.value = value ? pesoFormatter.format(value) : '';
  });
  amountInput.addEventListener('focus', () => {
    const value = readPesoValue(amountInput.value);
    amountInput.value = value ? String(value) : '';
  });
  modeInputs.forEach(input => input.addEventListener('change', calculateAndRender));
  startInput.addEventListener('input', calculateAndRender);
  endInput.addEventListener('input', calculateAndRender);
  copyButton.addEventListener('click', async () => {
    if (currentIbc === null || copyButton.disabled) return;
    await copyText(String(currentIbc));
    copyButton.classList.add('is-copied');
    copyButton.dataset.feedback = i18n('Copied', 'Copiado');
    renderIcon(copyButton, Check);
    window.setTimeout(() => {
      copyButton.classList.remove('is-copied');
      copyButton.dataset.feedback = '';
      renderIcon(copyButton, Copy);
    }, 1600);
  });

  restoreValues();
  return { calculateAndRender };
}
