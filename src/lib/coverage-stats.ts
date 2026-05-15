import "server-only";
import { isHoliday } from "./holidays";

export type CoverageStats = {
  /** Total filled (employee, date, shiftType) cells in the visible week. */
  filledSlots: number;
  /** Total expected cells = days_excluding_holidays × 3 shift types. */
  totalSlots: number;
  /** Coverage percentage 0..100, rounded to 1 decimal. */
  coveragePct: number;
  /** Top 3 days by shift count, sorted desc. */
  topDays: Array<{ dateIso: string; count: number; weekdayLabel: string }>;
  /** Days with 0 shifts assigned (excluding holidays). */
  emptyDays: Array<{ dateIso: string; weekdayLabel: string }>;
  /** Average shifts per active employee (employees who appear at least once). */
  avgShiftsPerEmployee: number;
  /** Number of distinct employees with ≥1 shift this week. */
  activeEmployees: number;
};

const VN_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function dateIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  // Mon=0..Sun=6 → already accounted via weekday array
  const day = dt.getDay(); // 0=Sun..6=Sat
  const idx = day === 0 ? 6 : day - 1;
  return `${VN_WEEKDAYS[idx]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export function computeCoverageStats(
  shifts: Array<{ shiftDate: Date; shiftType: string | null; employeeId: number }>,
  weekStart: Date,
): CoverageStats {
  const SHIFT_TYPES = ["morning", "afternoon", "evening"] as const;

  const dayKeys: string[] = [];
  const dayDates: Date[] = [];
  let nonHolidayDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = dateIso(d);
    dayKeys.push(iso);
    dayDates.push(d);
    if (!isHoliday(d)) nonHolidayDays++;
  }

  const filled = new Set<string>();
  const perDay = new Map<string, number>();
  const employeeShiftCount = new Map<number, number>();

  for (const s of shifts) {
    if (!s.shiftType || !SHIFT_TYPES.includes(s.shiftType as (typeof SHIFT_TYPES)[number])) {
      continue;
    }
    const iso = dateIso(s.shiftDate);
    filled.add(`${iso}::${s.shiftType}`);
    perDay.set(iso, (perDay.get(iso) ?? 0) + 1);
    employeeShiftCount.set(
      s.employeeId,
      (employeeShiftCount.get(s.employeeId) ?? 0) + 1,
    );
  }

  const totalSlots = nonHolidayDays * SHIFT_TYPES.length;
  const filledSlots = filled.size;
  const coveragePct =
    totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 1000) / 10 : 0;

  const topDays = Array.from(perDay.entries())
    .map(([iso, count]) => ({
      dateIso: iso,
      count,
      weekdayLabel: dayLabel(iso),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const emptyDays = dayKeys
    .filter((iso, i) => !perDay.has(iso) && !isHoliday(dayDates[i]))
    .map((iso) => ({ dateIso: iso, weekdayLabel: dayLabel(iso) }));

  const activeEmployees = employeeShiftCount.size;
  const totalShifts = Array.from(employeeShiftCount.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const avgShiftsPerEmployee =
    activeEmployees > 0
      ? Math.round((totalShifts / activeEmployees) * 10) / 10
      : 0;

  return {
    filledSlots,
    totalSlots,
    coveragePct,
    topDays,
    emptyDays,
    avgShiftsPerEmployee,
    activeEmployees,
  };
}
