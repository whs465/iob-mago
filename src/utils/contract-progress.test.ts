import { describe, expect, it } from 'vitest';
import {
  calculateContractProgress,
  dias360,
  getContractReportDates,
  getContractReportInfo,
  getContractReportPoints,
  getInclusiveMonthSpan,
  getLastClosedReportDate,
} from './contract-progress';
import { parseInputDate } from './locale';

describe('contract progress utilities', () => {
  it('calculates inclusive month spans', () => {
    expect(getInclusiveMonthSpan(parseInputDate('2026-01-01'), parseInputDate('2026-01-31'))).toBe(1);
    expect(getInclusiveMonthSpan(parseInputDate('2026-01-15'), parseInputDate('2026-03-01'))).toBe(3);
  });

  it('bounds report info to the contract end date', () => {
    expect(getContractReportInfo(
      parseInputDate('2026-01-01'),
      parseInputDate('2026-03-31'),
      parseInputDate('2026-05-01'),
    )).toEqual({ currentReport: 3, totalReports: 3 });
  });

  it('matches the legacy inclusive DÍAS360 behavior', () => {
    expect(dias360('2026-01-01', '2026-01-30')).toBe(30);
    expect(dias360('2026-01-01', '2026-02-01')).toBe(31);
  });

  it('calculates bounded contract progress percentage', () => {
    expect(calculateContractProgress('2026-01-01', '2026-01-30', '2026-01-15')).toBe(50);
    expect(calculateContractProgress('2026-01-01', '2026-01-30', '2026-02-15')).toBe(100);
  });

  it('creates one report per inclusive calendar month across years', () => {
    const reports = getContractReportDates(
      parseInputDate('2026-12-01'),
      parseInputDate('2027-04-03'),
    );

    expect(reports.map(date => [date.getFullYear(), date.getMonth() + 1, date.getDate()])).toEqual([
      [2026, 12, 31],
      [2027, 1, 31],
      [2027, 2, 28],
      [2027, 3, 31],
      [2027, 4, 3],
    ]);
  });

  it('counts a one-day first month as report one', () => {
    const points = getContractReportPoints('2026-01-31', '2026-04-30');

    expect(points).toHaveLength(4);
    expect(points[0]).toMatchObject({ reportNumber: 1, totalReports: 4 });
    expect(points[0].percentage).toBeGreaterThan(0);
  });

  it('finds the last closed report without losing the current percentage', () => {
    const start = parseInputDate('2026-12-01');
    const end = parseInputDate('2027-04-03');

    expect(getLastClosedReportDate(start, end, parseInputDate('2027-03-02')))
      .toEqual(parseInputDate('2027-02-28'));
    expect(getLastClosedReportDate(start, end, parseInputDate('2026-12-15'))).toBeNull();
    expect(getLastClosedReportDate(start, end, parseInputDate('2027-04-10')))
      .toEqual(parseInputDate('2027-04-03'));
  });
});
