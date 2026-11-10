export const COLOMBIA_SMMLV_2026 = 1_750_905;
export const COLOMBIA_MAX_IBC_2026 = COLOMBIA_SMMLV_2026 * 25;
export const CONTRACT_SERVICE_IBC_RATE = 0.4;
export const HEALTH_CONTRIBUTION_RATE = 0.125;
export const PENSION_CONTRIBUTION_RATE = 0.16;

export const ARL_RATES = {
  1: 0.00522,
  2: 0.01044,
  3: 0.02436,
  4: 0.0435,
  5: 0.0696,
} as const;

export type ArlRiskLevel = keyof typeof ARL_RATES;

export type ContractIbcPeriod =
  | { mode: 'full-month' }
  | { mode: 'days'; startDate: string; endDate: string };

export type ContractIbcResult = {
  ibc: number;
  days: number;
  monthlyIbc: number;
  rawMonthlyIbc: number;
  adjustment: 'minimum' | 'maximum' | null;
};

export type SocialSecurityContributions = {
  health: number;
  pension: number;
  arl: number;
  arlRate: number;
  total: number;
};

export function roundIbcUp(value: number) {
  return Math.ceil(value);
}

export function roundContributionUp(value: number) {
  return Math.ceil(value / 100) * 100;
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return date;
}

export function getContractContributionDays(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) throw new Error('invalid-date');
  if (end < start) throw new Error('invalid-range');
  if (
    start.getUTCFullYear() !== end.getUTCFullYear()
    || start.getUTCMonth() !== end.getUTCMonth()
  ) throw new Error('different-months');

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.min(Math.round((end.getTime() - start.getTime()) / millisecondsPerDay) + 1, 30);
}

export function calculateContractIbc(
  monthlyIncome: number,
  period: ContractIbcPeriod,
  minimumMonthlyIbc = COLOMBIA_SMMLV_2026,
  maximumMonthlyIbc = COLOMBIA_MAX_IBC_2026,
): ContractIbcResult {
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) throw new Error('invalid-income');

  const rawMonthlyIbc = monthlyIncome * CONTRACT_SERVICE_IBC_RATE;
  const monthlyIbc = Math.min(Math.max(rawMonthlyIbc, minimumMonthlyIbc), maximumMonthlyIbc);
  const adjustment = rawMonthlyIbc < minimumMonthlyIbc
    ? 'minimum'
    : rawMonthlyIbc > maximumMonthlyIbc
      ? 'maximum'
      : null;
  const days = period.mode === 'full-month'
    ? 30
    : getContractContributionDays(period.startDate, period.endDate);

  return {
    ibc: roundIbcUp(monthlyIbc * (days / 30)),
    days,
    monthlyIbc: roundIbcUp(monthlyIbc),
    rawMonthlyIbc: roundIbcUp(rawMonthlyIbc),
    adjustment,
  };
}

export function calculateSocialSecurityContributions(
  ibc: number,
  arlRiskLevel: ArlRiskLevel | null,
): SocialSecurityContributions {
  if (!Number.isFinite(ibc) || ibc < 0) throw new Error('invalid-ibc');

  const arlRate = arlRiskLevel === null ? 0 : ARL_RATES[arlRiskLevel];
  const health = roundContributionUp(ibc * HEALTH_CONTRIBUTION_RATE);
  const pension = roundContributionUp(ibc * PENSION_CONTRIBUTION_RATE);
  const arl = roundContributionUp(ibc * arlRate);

  return {
    health,
    pension,
    arl,
    arlRate,
    total: health + pension + arl,
  };
}
