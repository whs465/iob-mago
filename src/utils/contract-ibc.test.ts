import { describe, expect, it } from 'vitest';
import {
  calculateSocialSecurityContributions,
  calculateContractIbc,
  COLOMBIA_MAX_IBC_2026,
  COLOMBIA_SMMLV_2026,
  getContractContributionDays,
  roundContributionUp,
  roundIbcUp,
} from './contract-ibc';

describe('contract IBC', () => {
  it('uses 40% of the monthly contract value for a full month', () => {
    expect(calculateContractIbc(10_000_000, { mode: 'full-month' })).toMatchObject({
      ibc: 4_000_000,
      days: 30,
      adjustment: null,
    });
  });

  it('prorates the IBC and its minimum by contribution days', () => {
    const result = calculateContractIbc(2_000_000, {
      mode: 'days',
      startDate: '2026-11-10',
      endDate: '2026-11-19',
    });

    expect(result.days).toBe(10);
    expect(result.adjustment).toBe('minimum');
    expect(result.ibc).toBe(Math.ceil(COLOMBIA_SMMLV_2026 / 3));
  });

  it('caps the monthly IBC at 25 minimum salaries', () => {
    expect(calculateContractIbc(200_000_000, { mode: 'full-month' }).ibc)
      .toBe(COLOMBIA_MAX_IBC_2026);
  });

  it('counts inclusive dates and uses a maximum of 30 PILA days', () => {
    expect(getContractContributionDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(getContractContributionDays('2026-02-10', '2026-02-12')).toBe(3);
  });

  it('rejects ranges that span different contribution months', () => {
    expect(() => getContractContributionDays('2026-11-30', '2026-12-01'))
      .toThrow('different-months');
  });

  it('calculates health, pension, ARL and the total to pay', () => {
    expect(calculateSocialSecurityContributions(4_800_000, 1)).toEqual({
      health: 600_000,
      pension: 768_000,
      arl: 25_100,
      arlRate: 0.00522,
      total: 1_393_100,
    });
  });

  it('rounds IBC to the next peso and each contribution to the next hundred', () => {
    expect(roundIbcUp(4_800_000.01)).toBe(4_800_001);
    expect(roundContributionUp(25_056)).toBe(25_100);
    expect(roundContributionUp(600_000)).toBe(600_000);
  });
});
