import type { SignatureMetaTranslator } from './signature-preview';
import { renderContractProgressResult, resetContractProgressFields, type ContractTimelinePointView } from './contract-progress';
import { getInputValue, setInputValue, getRequiredElement } from './dom';
import {
  calculateContractProgress,
  getContractReportPoints,
  getLastClosedReportDate,
} from '../utils/contract-progress';
import { parseInputDate, toDateInputValue } from '../utils/locale';

export type ContractProgressFlowOptions = {
  i18n: SignatureMetaTranslator;
  formatDateValue: (date: Date) => string;
  formatDateTimeValue: (date: Date) => string;
  now?: () => Date;
};

export type ContractProgressFlowApi = {
  calcularAvance(): void;
  autoCalcularAvance(): void;
  initFromLocalStorage(): boolean;
};

function clampDate(value: Date, start: Date, end: Date) {
  if (value < start) return start;
  if (value > end) return end;
  return value;
}

function getPosition(date: Date, start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) return 100;
  return Math.min(Math.max(((date.getTime() - start.getTime()) / duration) * 100, 0), 100);
}

function getTodayTimelinePosition(today: Date, start: Date, reportDates: Date[]) {
  if (reportDates.length === 0) return 0;
  const reportIndex = reportDates.findIndex(date => today <= date);
  if (reportIndex < 0) return 100;

  const segmentStart = reportIndex === 0
    ? start
    : new Date(
      reportDates[reportIndex - 1].getFullYear(),
      reportDates[reportIndex - 1].getMonth(),
      reportDates[reportIndex - 1].getDate() + 1,
    );
  const segmentEnd = reportDates[reportIndex];
  const segmentDuration = Math.max(segmentEnd.getTime() - segmentStart.getTime(), 1);
  const segmentProgress = Math.min(Math.max((today.getTime() - segmentStart.getTime()) / segmentDuration, 0), 1);
  return ((reportIndex + segmentProgress) / reportDates.length) * 100;
}

export function setupContractProgressFlow({
  i18n,
  formatDateValue,
  formatDateTimeValue: _formatDateTimeValue,
  now = () => new Date(),
}: ContractProgressFlowOptions): ContractProgressFlowApi {
  const locale = i18n('en-US', 'es-CO');
  const shortDateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  function setDateEditorExpanded(expanded: boolean) {
    const editor = getRequiredElement('contract-date-editor');
    const action = getRequiredElement<HTMLButtonElement>('contract-date-edit-action');
    editor.toggleAttribute('hidden', !expanded);
    action.setAttribute('aria-expanded', String(expanded));
    action.textContent = expanded ? i18n('Close', 'Cerrar') : i18n('Edit', 'Editar');
  }

  function setMessage(message: string, type: 'error' | 'neutral' = 'neutral') {
    const element = getRequiredElement('mensaje-guardado');
    element.textContent = message;
    element.dataset.type = type;
  }

  function createTimelinePoint(
    date: Date,
    percentage: number,
    tooltipText: string,
    start: Date,
    end: Date,
    today: Date,
    isToday = false,
    position?: number,
  ): ContractTimelinePointView {
    return {
      shortDateText: isToday ? i18n('Today', 'Hoy') : shortDateFormatter.format(date),
      tooltipText,
      percentage,
      position: position ?? getPosition(date, start, end),
      isPast: date <= today,
      isToday,
    };
  }

  function calcularAvance() {
    const startValue = getInputValue('fecha-inicial');
    const endValue = getInputValue('fecha-final');

    if (!startValue || !endValue) {
      resetContractProgressFields();
      setMessage(i18n('Set the contract start and end dates.', 'Configura el inicio y el fin del contrato.'));
      return;
    }

    const start = parseInputDate(startValue);
    const end = parseInputDate(endValue);
    if (end < start) {
      resetContractProgressFields();
      setMessage(
        i18n('The end date must be on or after the start date.', 'La fecha final debe ser igual o posterior a la inicial.'),
        'error',
      );
      return;
    }

    const today = now();
    const currentPercentage = calculateContractProgress(startValue, endValue, toDateInputValue(today));
    const reportPoints = getContractReportPoints(startValue, endValue);
    const lastClosedDate = getLastClosedReportDate(start, end, today);
    const lastClosedPoint = lastClosedDate
      ? reportPoints.find(point => point.date.getTime() === lastClosedDate.getTime()) || null
      : null;

    const timelinePoints = reportPoints.map((point, index) => {
      const isToday = point.date.toDateString() === today.toDateString();
      return createTimelinePoint(
        point.date,
        point.percentage,
        i18n(
          'Report {{current}} of {{total}}\nCutoff: {{date}}\nProgress: {{percentage}}%',
          'Informe {{current}} de {{total}}\nCorte: {{date}}\nAvance: {{percentage}}%',
          {
            current: String(point.reportNumber),
            total: String(point.totalReports),
            date: formatDateValue(point.date),
            percentage: point.percentage.toFixed(1),
          },
        ),
        start,
        end,
        today,
        isToday,
        ((index + 1) / reportPoints.length) * 100,
      );
    });

    const boundedToday = clampDate(today, start, end);
    const todayPoint = today >= start && today <= end
      ? createTimelinePoint(
        boundedToday,
        currentPercentage,
        i18n(
          'Current progress\n{{date}}\n{{percentage}}%',
          'Avance actual\n{{date}}\n{{percentage}}%',
          { date: formatDateValue(today), percentage: currentPercentage.toFixed(1) },
        ),
        start,
        end,
        today,
        true,
        getTodayTimelinePosition(today, start, reportPoints.map(point => point.date)),
      )
      : null;

    const currentDateText = today < start
      ? i18n('Starts on {{date}}', 'Inicia el {{date}}', { date: formatDateValue(start) })
      : today > end
        ? i18n('Completed on {{date}}', 'Finalizó el {{date}}', { date: formatDateValue(end) })
        : i18n('As of {{date}}', 'Al {{date}}', { date: formatDateValue(today) });

    renderContractProgressResult({
      currentPercentage,
      currentDateText,
      lastReportPercentage: lastClosedPoint?.percentage ?? null,
      lastReportText: lastClosedPoint
        ? i18n(
          '{{date}} · Report {{current}} of {{total}}',
          '{{date}} · Informe {{current}} de {{total}}',
          {
            date: formatDateValue(lastClosedPoint.date),
            current: String(lastClosedPoint.reportNumber),
            total: String(lastClosedPoint.totalReports),
          },
        )
        : i18n('No monthly cutoff yet', 'Aún no hay cierre mensual'),
      periodText: `${formatDateValue(start)} → ${formatDateValue(end)}`,
      timelinePoints,
      todayPoint,
    });

    setMessage(i18n(
      '{{count}} monthly report(s) across the contract.',
      '{{count}} informe(s) mensual(es) durante el contrato.',
      { count: String(reportPoints.length) },
    ));

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const todayElement = document.querySelector<HTMLElement>('.contract-timeline-point.is-today');
        const timelineScroller = document.querySelector<HTMLElement>('.contract-timeline-scroll');
        if (todayElement && timelineScroller && typeof timelineScroller.scrollTo === 'function') {
          timelineScroller.scrollTo({
            left: todayElement.offsetLeft - (timelineScroller.clientWidth / 2),
            behavior: 'smooth',
          });
        }
      });
    }
  }

  function autoCalcularAvance() {
    const startValue = getInputValue('fecha-inicial');
    const endValue = getInputValue('fecha-final');
    calcularAvance();

    if (startValue && endValue && parseInputDate(startValue) <= parseInputDate(endValue)) {
      localStorage.setItem('fechasAvance', JSON.stringify({ fechaInicial: startValue, fechaFinal: endValue }));
    } else if (!startValue || !endValue) {
      localStorage.removeItem('fechasAvance');
    }
  }

  function initFromLocalStorage() {
    const saved = localStorage.getItem('fechasAvance');
    if (!saved) {
      setDateEditorExpanded(true);
      calcularAvance();
      return false;
    }

    try {
      const dates = JSON.parse(saved);
      setInputValue('fecha-inicial', dates.fechaInicial || '');
      setInputValue('fecha-final', dates.fechaFinal || '');
      setDateEditorExpanded(false);
      calcularAvance();
      return Boolean(dates.fechaInicial && dates.fechaFinal);
    } catch {
      localStorage.removeItem('fechasAvance');
      setDateEditorExpanded(true);
      calcularAvance();
      return false;
    }
  }

  getRequiredElement('contract-date-edit-action').addEventListener('click', () => {
    const expanded = getRequiredElement('contract-date-edit-action').getAttribute('aria-expanded') === 'true';
    setDateEditorExpanded(!expanded);
  });

  (window as unknown as Record<string, unknown>).calcularAvance = calcularAvance;
  (window as unknown as Record<string, unknown>).autoCalcularAvance = autoCalcularAvance;

  return { calcularAvance, autoCalcularAvance, initFromLocalStorage };
}
