import "server-only";
import { prisma } from "./prisma";

export type PayrollPeriodTotals = {
  period: string;
  totalPay: number;
  totalHours: number;
  employeeCount: number;
};

/**
 * Compute the previous YYYY-MM period string for a given period.
 * Wraps the year when month is "01" (e.g. "2026-01" -> "2025-12").
 * Returns the input untouched if it does not match the YYYY-MM shape.
 */
export function previousPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return period;
  if (month <= 1) {
    return `${year - 1}-12`;
  }
  const prevMonth = month - 1;
  return `${year}-${String(prevMonth).padStart(2, "0")}`;
}

/**
 * Aggregate persisted payroll snapshot rows for a given period.
 * Only counts employees with totalPay > 0 toward employeeCount.
 */
export async function getPeriodTotals(
  period: string,
): Promise<PayrollPeriodTotals> {
  const records = await prisma.payroll
    .findMany({
      where: { period },
      select: { totalPay: true, totalHours: true },
    })
    .catch(
      () =>
        [] as Array<{
          totalPay: unknown;
          totalHours: unknown;
        }>,
    );

  let totalPay = 0;
  let totalHours = 0;
  let employeeCount = 0;
  for (const r of records) {
    const pay = Number(r.totalPay ?? 0);
    const hours = Number(r.totalHours ?? 0);
    if (Number.isFinite(pay)) totalPay += pay;
    if (Number.isFinite(hours)) totalHours += hours;
    if (Number.isFinite(pay) && pay > 0) employeeCount += 1;
  }

  return {
    period,
    totalPay: Number(totalPay.toFixed(2)),
    totalHours: Number(totalHours.toFixed(2)),
    employeeCount,
  };
}

export async function getPeriodComparison(period: string): Promise<{
  current: PayrollPeriodTotals;
  previous: PayrollPeriodTotals;
}> {
  const prev = previousPeriod(period);
  const [current, previous] = await Promise.all([
    getPeriodTotals(period),
    getPeriodTotals(prev),
  ]);
  return { current, previous };
}
