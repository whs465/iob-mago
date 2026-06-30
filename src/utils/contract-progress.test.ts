import { describe, expect, it } from 'vitest';
import { calculateContractProgress, dias360, getContractReportInfo, getInclusiveMonthSpan } from './contract-progress';
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
});
