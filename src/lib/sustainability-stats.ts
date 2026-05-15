import type { SustainDay } from "./sustainability-state";

export type SustainStats = {
  thisWeekTotals: Record<string, number>;
  lastWeekTotals: Record<string, number>;
  acceptanceRatePct: number | null;
  ecoScore: number; // 0-100
  daysWithData: number;
};

const NUMERIC_FIELDS = [
  "compostKg",
  "recyclingKg",
  "reusableCupsOffered",
  "reusableCupsAccepted",
  "waterSavedLiters",
] as const;

// Daily benchmarks for normalization. A 7-day total that hits these per day
// would yield 100% on that metric.
const BENCHMARK_PER_DAY = {
  compostKg: 5, // 5 kg/day = strong composting
  recyclingKg: 5, // 5 kg/day = strong recycling
  waterSavedLiters: 50, // 50L/day saved
};

const WEIGHTS = {
  compost: 0.35,
  recycling: 0.35,
  cupAcceptance: 0.2,
  water: 0.1,
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(date: Date, deltaDays: number): Date {
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + deltaDays);
  return out;
}

function inRange(date: string, startInclusive: string, endInclusive: string): boolean {
  return date >= startInclusive && date <= endInclusive;
}

function sumWindow(days: SustainDay[], start: string, end: string): Record<string, number> {
  const totals: Record<string, number> = {
    compostKg: 0,
    recyclingKg: 0,
    reusableCupsOffered: 0,
    reusableCupsAccepted: 0,
    waterSavedLiters: 0,
  };
  for (const d of days) {
    if (!inRange(d.date, start, end)) continue;
    for (const f of NUMERIC_FIELDS) {
      totals[f] = (totals[f] ?? 0) + d[f];
    }
  }
  return totals;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function computeSustainStats(
  days: SustainDay[],
  today?: Date,
): SustainStats {
  const ref = today ?? new Date();
  const refStart = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate(),
  );

  const thisWeekStart = ymd(shiftDays(refStart, -6));
  const thisWeekEnd = ymd(refStart);
  const lastWeekStart = ymd(shiftDays(refStart, -13));
  const lastWeekEnd = ymd(shiftDays(refStart, -7));

  const thisWeekTotals = sumWindow(days, thisWeekStart, thisWeekEnd);
  const lastWeekTotals = sumWindow(days, lastWeekStart, lastWeekEnd);

  const offered = thisWeekTotals.reusableCupsOffered ?? 0;
  const accepted = thisWeekTotals.reusableCupsAccepted ?? 0;
  const acceptanceRatePct =
    offered > 0 ? Math.round((accepted / offered) * 100) : null;

  const compostNorm = clamp01(
    (thisWeekTotals.compostKg ?? 0) / (BENCHMARK_PER_DAY.compostKg * 7),
  );
  const recyclingNorm = clamp01(
    (thisWeekTotals.recyclingKg ?? 0) / (BENCHMARK_PER_DAY.recyclingKg * 7),
  );
  const cupNorm = clamp01(
    offered > 0 ? accepted / offered : 0,
  );
  const waterNorm = clamp01(
    (thisWeekTotals.waterSavedLiters ?? 0) /
      (BENCHMARK_PER_DAY.waterSavedLiters * 7),
  );

  const score =
    compostNorm * WEIGHTS.compost +
    recyclingNorm * WEIGHTS.recycling +
    cupNorm * WEIGHTS.cupAcceptance +
    waterNorm * WEIGHTS.water;

  const ecoScore = Math.round(clamp01(score) * 100);

  let daysWithData = 0;
  for (const d of days) {
    let any = false;
    for (const f of NUMERIC_FIELDS) {
      if (d[f] > 0) {
        any = true;
        break;
      }
    }
    if (any) daysWithData += 1;
  }

  return {
    thisWeekTotals,
    lastWeekTotals,
    acceptanceRatePct,
    ecoScore,
    daysWithData,
  };
}
