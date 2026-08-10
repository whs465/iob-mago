import { parseInputDate } from './locale';

export function getInclusiveMonthSpan(startDate: Date, endDate: Date) {
  return ((endDate.getFullYear() - startDate.getFullYear()) * 12)
    + (endDate.getMonth() - startDate.getMonth())
    + 1;
}

export function getContractReportInfo(startDate: Date, endDate: Date, calculationDate: Date) {
  const boundedCalculationDate = calculationDate > endDate ? endDate : calculationDate;
  const totalReports = Math.max(getInclusiveMonthSpan(startDate, endDate), 1);
  const currentReport = Math.min(
    Math.max(getInclusiveMonthSpan(startDate, boundedCalculationDate), 1),
    totalReports,
  );

  return { currentReport, totalReports };
}

export type ContractReportPoint = {
  date: Date;
  reportNumber: number;
  totalReports: number;
  percentage: number;
};

function getMonthEnd(year: number, month: number) {
  return new Date(year, month + 1, 0);
}

export function getContractReportDates(startDate: Date, endDate: Date) {
  if (endDate < startDate) return [];

  const dates: Date[] = [];
  let year = startDate.getFullYear();
  let month = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const monthEnd = getMonthEnd(year, month);
    dates.push(monthEnd > endDate ? new Date(endDate) : monthEnd);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return dates;
}

export function getLastClosedReportDate(startDate: Date, endDate: Date, today: Date) {
  if (today < startDate) return null;

  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const closedThrough = today >= endDate ? endDate : previousMonthEnd;
  const reports = getContractReportDates(startDate, endDate).filter(date => date <= closedThrough);
  return reports.length > 0 ? reports[reports.length - 1] : null;
}

export function getContractReportPoints(
  startDateValue: string,
  endDateValue: string,
): ContractReportPoint[] {
  const startDate = parseInputDate(startDateValue);
  const endDate = parseInputDate(endDateValue);
  const dates = getContractReportDates(startDate, endDate);

  return dates.map((date, index) => ({
    date,
    reportNumber: index + 1,
    totalReports: dates.length,
    percentage: calculateContractProgress(
      startDateValue,
      endDateValue,
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    ),
  }));
}

// Excel-style DÍAS360 calculation used by the legacy contract progress tool.
export function dias360(startDateValue: string, endDateValue: string) {
  const startDate = parseInputDate(startDateValue);
  const endDate = parseInputDate(endDateValue);

  return (endDate.getFullYear() - startDate.getFullYear()) * 360
    + (endDate.getMonth() - startDate.getMonth()) * 30
    + (endDate.getDate() - startDate.getDate())
    + 1;
}

export function calculateContractProgress(startDateValue: string, endDateValue: string, calculationDateValue: string) {
  const totalDays = dias360(startDateValue, endDateValue);
  const elapsedDays = dias360(startDateValue, calculationDateValue);
  return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
}
