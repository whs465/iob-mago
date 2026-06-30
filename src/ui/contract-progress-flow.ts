import type { SignatureMetaTranslator } from './signature-preview';
import { renderContractProgressResult, resetContractProgressFields } from './contract-progress';
import { getInputValue, setInputValue, getRequiredElement } from './dom';
import { calculateContractProgress, getContractReportInfo } from '../utils/contract-progress';
import { parseInputDate, toDateInputValue } from '../utils/locale';

export type ContractProgressFlowOptions = {
  i18n: SignatureMetaTranslator;
  formatDateValue: (date: Date) => string;
  formatDateTimeValue: (date: Date) => string;
};

export type ContractProgressFlowApi = {
  calcularAvance(): void;
  autoCalcularAvance(): void;
  initFromLocalStorage(): boolean;
};

export function setupContractProgressFlow({
  i18n,
  formatDateValue,
  formatDateTimeValue,
}: ContractProgressFlowOptions): ContractProgressFlowApi {
  let contractCompletionCelebrated = false;
  let contractCompletionTimer: ReturnType<typeof setTimeout> | null = null;

  function resetContractProgressDisplay() {
    resetContractProgressFields();
    resetContractCompletionCelebration(true);
  }

  function resetContractCompletionCelebration(resetMilestone = false) {
    const card = getRequiredElement('avance-result-card');
    card.classList.remove('celebrating');
    if (contractCompletionTimer) {
      clearTimeout(contractCompletionTimer);
      contractCompletionTimer = null;
    }
    if (resetMilestone) {
      contractCompletionCelebrated = false;
    }
  }

  function triggerContractCompletionCelebration() {
    const card = getRequiredElement('avance-result-card');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    resetContractCompletionCelebration();
    void card.offsetWidth;
    card.classList.add('celebrating');

    contractCompletionTimer = window.setTimeout(() => {
      card.classList.remove('celebrating');
      contractCompletionTimer = null;
    }, reducedMotion ? 2200 : 2800);
  }

  function formatDate(dateStr: string) {
    return formatDateValue(parseInputDate(dateStr));
  }

  function calcularAvance() {
    const fechaInicialVal = getInputValue('fecha-inicial');
    const fechaFinalVal = getInputValue('fecha-final');
    const fechaCalculoVal = getInputValue('fecha-calculo');
    const msg = getRequiredElement('mensaje-guardado');

    if (!fechaInicialVal || !fechaFinalVal) {
      resetContractProgressDisplay();
      msg.textContent = i18n(
        '✗ Enter the contract start and end dates to calculate',
        '✗ Ingresa la fecha inicial y final para calcular',
      );
      msg.style.color = '#ff6b6b';
      return;
    }

    if (!fechaCalculoVal) {
      resetContractProgressDisplay();
      msg.textContent = i18n(
        '✗ Enter the calculation date',
        '✗ Ingresa la fecha de cálculo',
      );
      msg.style.color = '#ff6b6b';
      return;
    }

    const fechaInicial = parseInputDate(fechaInicialVal);
    const fechaFinal = parseInputDate(fechaFinalVal);
    const fechaCalculo = parseInputDate(fechaCalculoVal);

    if (fechaFinal <= fechaInicial) {
      resetContractProgressDisplay();
      msg.textContent = i18n(
        '✗ The end date must be after the start date',
        '✗ La fecha final debe ser posterior a la inicial',
      );
      msg.style.color = '#ff6b6b';
      return;
    }

    if (fechaCalculo < fechaInicial) {
      resetContractProgressDisplay();
      msg.textContent = i18n(
        '✗ The calculation date cannot be before the start date',
        '✗ La fecha de cálculo no puede ser anterior al inicio',
      );
      msg.style.color = '#ff6b6b';
      return;
    }

    const porcentaje = calculateContractProgress(fechaInicialVal, fechaFinalVal, fechaCalculoVal);

    const reportInfo = getContractReportInfo(fechaInicial, fechaFinal, fechaCalculo);
    renderContractProgressResult({
      startText: formatDate(fechaInicialVal),
      endText: formatDate(fechaFinalVal),
      reportText: i18n(
        'Month {{current}} / {{total}}',
        'Mes {{current}} / {{total}}',
        {
          current: String(reportInfo.currentReport),
          total: String(reportInfo.totalReports),
        },
      ),
      percentage: porcentaje,
    });

    if (porcentaje >= 100) {
      if (!contractCompletionCelebrated) {
        triggerContractCompletionCelebration();
        contractCompletionCelebrated = true;
      }
    } else {
      resetContractCompletionCelebration(true);
    }
  }

  function autoCalcularAvance() {
    const fi = getInputValue('fecha-inicial');
    const ff = getInputValue('fecha-final');
    const card = getRequiredElement('avance-result-card');
    if (fi && ff) {
      card.classList.add('visible');
      calcularAvance();
      // Guardar automáticamente si el período es válido
      if (parseInputDate(fi) < parseInputDate(ff)) {
        localStorage.setItem('fechasAvance', JSON.stringify({
          fechaInicial: fi,
          fechaFinal: ff,
          guardado: new Date().toISOString(),
        }));
      }
    } else {
      card.classList.remove('visible');
      resetContractProgressDisplay();
    }
  }

  function initFromLocalStorage() {
    const hoy = toDateInputValue();
    setInputValue('fecha-calculo', hoy);

    const guardado = localStorage.getItem('fechasAvance');
    if (guardado) {
      try {
        const fechas = JSON.parse(guardado);
        setInputValue('fecha-inicial', fechas.fechaInicial || '');
        setInputValue('fecha-final', fechas.fechaFinal || '');
        setInputValue('fecha-calculo', hoy);

        const msg = getRequiredElement('mensaje-guardado');
        msg.textContent = i18n(
          '✓ Dates loaded (saved on {{date}})',
          '✓ Fechas cargadas (guardadas el {{date}})',
          { date: formatDateTimeValue(new Date(fechas.guardado)) },
        );
        msg.style.color = '#00d9ff';

        getRequiredElement('avance-result-card').classList.add('visible');
        setTimeout(calcularAvance, 100);
        return true;
      } catch (e) {
        localStorage.removeItem('fechasAvance');
      }
    }
    return false;
  }

  // Exponer al window para los onclick/oninput del HTML
  (window as unknown as Record<string, unknown>).calcularAvance = calcularAvance;
  (window as unknown as Record<string, unknown>).autoCalcularAvance = autoCalcularAvance;

  return {
    calcularAvance,
    autoCalcularAvance,
    initFromLocalStorage,
  };
}
