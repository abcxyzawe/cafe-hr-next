/**
 * Pure utility for projecting end-of-month earnings based on
 * the daily pace observed so far in the current calendar month.
 *
 * No DB access — accepts pre-aggregated numbers.
 */

export type ProjectedEarnings = {
  hoursSoFar: number;
  paySoFar: number;
  projectedHours: number;
  projectedPay: number;
  daysElapsed: number;
  daysInMonth: number;
  averagePerDay: number;
};

/**
 * Compute a simple linear projection for end-of-month earnings.
 *
 * Algorithm: averagePerDay = hoursSoFar / daysElapsed; projection extrapolates
 * to all days in the calendar month, then multiplies by hourly rate.
 *
 * @param args.hoursSoFar  Hours already worked in the current calendar month.
 * @param args.hourlyRate  Hourly pay rate (VND).
 * @param args.today       Optional clock override (mainly for tests).
 */
export function computeProjectedEarnings(args: {
  hoursSoFar: number;
  hourlyRate: number;
  today?: Date;
}): ProjectedEarnings {
  const today = args.today ?? new Date();
  const safeHours =
    Number.isFinite(args.hoursSoFar) && args.hoursSoFar > 0
      ? args.hoursSoFar
      : 0;
  const safeRate =
    Number.isFinite(args.hourlyRate) && args.hourlyRate > 0
      ? args.hourlyRate
      : 0;

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = today.getDate();

  const paySoFar = Math.round(safeHours * safeRate);

  if (daysElapsed <= 0) {
    return {
      hoursSoFar: Number(safeHours.toFixed(2)),
      paySoFar,
      projectedHours: Number(safeHours.toFixed(2)),
      projectedPay: paySoFar,
      daysElapsed: 0,
      daysInMonth,
      averagePerDay: 0,
    };
  }

  const averagePerDay = safeHours / daysElapsed;
  const projectedHoursRaw = averagePerDay * daysInMonth;
  const projectedHours = Number(projectedHoursRaw.toFixed(2));
  const projectedPay = Math.round(projectedHours * safeRate);

  return {
    hoursSoFar: Number(safeHours.toFixed(2)),
    paySoFar,
    projectedHours,
    projectedPay,
    daysElapsed,
    daysInMonth,
    averagePerDay: Number(averagePerDay.toFixed(2)),
  };
}
