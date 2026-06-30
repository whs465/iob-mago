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
