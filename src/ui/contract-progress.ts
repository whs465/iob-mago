import { getRequiredElement } from './dom';

export type ContractTimelinePointView = {
  shortDateText: string;
  tooltipText: string;
  percentage: number;
  position: number;
  isPast: boolean;
  isToday: boolean;
};

export type ContractProgressResult = {
  currentPercentage: number;
  currentDateText: string;
  lastReportPercentage: number | null;
  lastReportText: string;
  periodText: string;
  timelinePoints: ContractTimelinePointView[];
  todayPoint: ContractTimelinePointView | null;
};

function setText(id: string, text: string) {
  getRequiredElement(id).textContent = text;
}

export function resetContractProgressFields() {
  setText('current-progress-number', '—');
  setText('current-progress-date', '—');
  setText('last-report-number', '—');
  setText('last-report-meta', '—');
  setText('contract-period-text', 'Sin fechas configuradas');

  const progress = getRequiredElement('contract-progress-fill');
  progress.style.width = '0%';
  progress.setAttribute('aria-valuenow', '0');
  getRequiredElement('contract-timeline-track').replaceChildren();
}

function createTimelinePoint(point: ContractTimelinePointView, kind: 'report' | 'today') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `contract-timeline-point contract-timeline-${kind}${point.isPast ? ' is-past' : ''}${point.isToday ? ' is-today' : ''}`;
  button.style.left = `${point.position}%`;
  button.dataset.tooltip = point.tooltipText;
  button.setAttribute('aria-label', point.tooltipText);
  const showMobileDetail = () => {
    const detail = document.getElementById('contract-timeline-detail');
    if (!detail) return;
    detail.textContent = point.tooltipText;
    detail.classList.add('has-selection');
  };
  button.addEventListener('click', showMobileDetail);
  button.addEventListener('focus', showMobileDetail);

  const dot = document.createElement('span');
  dot.className = 'contract-timeline-dot';
  dot.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'contract-timeline-label';
  label.textContent = point.shortDateText;

  button.append(dot, label);
  return button;
}

export function renderContractProgressResult(result: ContractProgressResult) {
  setText('current-progress-number', result.currentPercentage.toFixed(1));
  setText('current-progress-date', result.currentDateText);
  setText('last-report-number', result.lastReportPercentage === null ? '—' : result.lastReportPercentage.toFixed(1));
  setText('last-report-meta', result.lastReportText);
  setText('contract-period-text', result.periodText);

  const progress = getRequiredElement('contract-progress-fill');
  progress.style.width = `${result.currentPercentage}%`;
  progress.setAttribute('aria-valuenow', result.currentPercentage.toFixed(0));

  const track = getRequiredElement('contract-timeline-track');
  track.replaceChildren();
  const mobileDetail = document.getElementById('contract-timeline-detail');
  if (mobileDetail) {
    mobileDetail.textContent = mobileDetail.dataset.defaultText || '';
    mobileDetail.classList.remove('has-selection');
  }
  track.style.setProperty('--timeline-min-width', `${Math.max(320, result.timelinePoints.length * 112)}px`);
  track.style.setProperty(
    '--timeline-current-position',
    `${result.todayPoint?.position ?? (result.currentPercentage >= 100 ? 100 : 0)}%`,
  );
  result.timelinePoints.forEach(point => track.appendChild(createTimelinePoint(point, 'report')));
  if (result.todayPoint && !result.timelinePoints.some(point => point.isToday)) {
    track.appendChild(createTimelinePoint(result.todayPoint, 'today'));
  }
}
