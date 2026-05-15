/**
 * Pure utility for projecting end-of-month hours based on
 * the daily pace observed so far in the current calendar month.
 *
 * No DB access — accepts pre-aggregated numbers.
 */

export type MonthForecast = {
  actualHours: number;
  projectedHours: number;
  daysElapsed: number;
  daysInMonth: number;
  pacePerDay: number;
  comparison: "ahead" | "ontrack" | "behind";
  vsLastMonth?: number | null;
};

/**
 * Compute a simple linear projection for end-of-month hours.
 *
 * @param actualHours   Hours already worked in the current calendar month.
 * @param lastMonthHours Optional total for last month — used for comparison.
 * @param now           Optional clock override (mainly for tests).
 */
export function computeMonthForecast(
  actualHours: number,
  lastMonthHours?: number | null,
  now: Date = new Date(),
): MonthForecast {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const safeActual = Number.isFinite(actualHours) && actualHours > 0
    ? actualHours
    : 0;

  if (daysElapsed <= 0) {
    return {
      actualHours: Number(safeActual.toFixed(1)),
      projectedHours: Number(safeActual.toFixed(1)),
      daysElapsed: 0,
      daysInMonth,
      pacePerDay: 0,
      comparison: "ontrack",
      vsLastMonth: null,
    };
  }

  const pacePerDay = safeActual / daysElapsed;
  const projectedRaw = pacePerDay * daysInMonth;
  const projectedHours = Number(projectedRaw.toFixed(1));

  const last =
    typeof lastMonthHours === "number" && Number.isFinite(lastMonthHours)
      ? lastMonthHours
      : null;

  let comparison: "ahead" | "ontrack" | "behind" = "ontrack";
  let vsLastMonth: number | null = null;

  if (last !== null && last > 0) {
    vsLastMonth = Number((((projectedHours - last) / last) * 100).toFixed(1));
    const upper = last * 1.05;
    const lower = last * 0.95;
    if (projectedHours > upper) comparison = "ahead";
    else if (projectedHours < lower) comparison = "behind";
    else comparison = "ontrack";
  }

  return {
    actualHours: Number(safeActual.toFixed(1)),
    projectedHours,
    daysElapsed,
    daysInMonth,
    pacePerDay: Number(pacePerDay.toFixed(2)),
    comparison,
    vsLastMonth,
  };
}
