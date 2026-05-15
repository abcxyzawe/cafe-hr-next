export type RoiInputs = {
  investmentVnd: number;
  monthlyFixedVnd: number;
  monthlyRevenueVnd: number;
  marginPct: number;
  growthRatePct: number;
};

export type MonthSnapshot = {
  month: number;
  revenue: number;
  grossProfit: number;
  fixedCosts: number;
  netProfit: number;
  cumulativeNet: number;
};

export type RoiResult = {
  monthly: MonthSnapshot[];
  breakevenMonth: number | null;
  totalNet24: number;
  net6: number;
  net12: number;
  net24: number;
};

const DEFAULT_HORIZON = 24;

function roundToThousand(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 1000) * 1000;
}

function safeNumber(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

export function projectRoi(inputs: RoiInputs, months: number = DEFAULT_HORIZON): RoiResult {
  const investment = Math.max(0, safeNumber(inputs.investmentVnd));
  const fixed = Math.max(0, safeNumber(inputs.monthlyFixedVnd));
  const baseRevenue = Math.max(0, safeNumber(inputs.monthlyRevenueVnd));
  const margin = Math.min(100, Math.max(0, safeNumber(inputs.marginPct))) / 100;
  const growth = safeNumber(inputs.growthRatePct) / 100;
  const horizon = Math.max(1, Math.floor(months));

  const monthly: MonthSnapshot[] = [];
  let cumulative = -investment;
  let breakevenMonth: number | null = null;

  for (let i = 1; i <= horizon; i++) {
    const rawRevenue = baseRevenue * Math.pow(1 + growth, i - 1);
    const revenue = roundToThousand(rawRevenue);
    const grossProfit = roundToThousand(revenue * margin);
    const fixedCosts = roundToThousand(fixed);
    const netProfit = roundToThousand(grossProfit - fixedCosts);
    cumulative = roundToThousand(cumulative + netProfit);

    if (breakevenMonth === null && cumulative >= 0) {
      breakevenMonth = i;
    }

    monthly.push({
      month: i,
      revenue,
      grossProfit,
      fixedCosts,
      netProfit,
      cumulativeNet: cumulative,
    });
  }

  const at = (m: number): number => {
    if (m <= 0 || monthly.length === 0) return 0;
    const idx = Math.min(monthly.length, m) - 1;
    return monthly[idx]?.cumulativeNet ?? 0;
  };

  const net6 = at(6);
  const net12 = at(12);
  const net24 = at(24);
  const totalNet24 = at(Math.min(24, monthly.length));

  return {
    monthly,
    breakevenMonth,
    totalNet24,
    net6,
    net12,
    net24,
  };
}
