import "server-only";
import { prisma } from "./prisma";

export type TrendSeries = {
  /** Always length 7, oldest first (index 0 = 6 days ago, index 6 = today). */
  values: number[];
  /** Sum of all values in the window (or last value for cumulative series). */
  total: number;
  /** Percent change from values[0] -> values[6], rounded. Undefined if both are 0. */
  change?: number;
};

export type DashboardTrends = {
  employees: TrendSeries;
  shifts: TrendSeries;
  attendance: TrendSeries;
  hours: TrendSeries;
};

const DAYS = 7;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function computeChange(values: number[]): number | undefined {
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  if (first === 0 && last === 0) return undefined;
  if (first === 0) return last > 0 ? 100 : -100;
  return Math.round(((last - first) / first) * 100);
}

export async function getDashboardTrends(): Promise<DashboardTrends> {
  const today = startOfDay(new Date());
  const windowStart = addDays(today, -(DAYS - 1));
  const windowEndExclusive = addDays(today, 1);

  // Build the 7 day buckets [oldest .. today]
  const dayBuckets: Date[] = [];
  for (let i = 0; i < DAYS; i++) {
    dayBuckets.push(addDays(windowStart, i));
  }
  const bucketKeys = dayBuckets.map(dayKey);

  const [
    totalEmployeesBefore,
    employeesCreatedInWindow,
    shiftsRows,
    attendanceRows,
  ] = await Promise.all([
    // Cumulative baseline: employees created strictly before the window start.
    prisma.employee.count({ where: { createdAt: { lt: windowStart } } }),
    // Employees created within the window — bucket on the client.
    prisma.employee.findMany({
      where: { createdAt: { gte: windowStart, lt: windowEndExclusive } },
      select: { createdAt: true },
    }),
    // Shifts grouped by shiftDate within window.
    prisma.shift.groupBy({
      by: ["shiftDate"],
      where: { shiftDate: { gte: windowStart, lt: windowEndExclusive } },
      _count: { _all: true },
    }),
    // Attendance check-ins (with hoursWorked) within the window.
    prisma.attendance.findMany({
      where: { checkIn: { gte: windowStart, lt: windowEndExclusive } },
      select: { checkIn: true, hoursWorked: true },
    }),
  ]);

  // ---- Employees (cumulative count at end-of-day) ----
  const newPerDay = new Array<number>(DAYS).fill(0);
  for (const e of employeesCreatedInWindow) {
    const idx = bucketKeys.indexOf(dayKey(new Date(e.createdAt)));
    if (idx >= 0) newPerDay[idx] += 1;
  }
  const employeesValues = new Array<number>(DAYS).fill(0);
  let running = totalEmployeesBefore;
  for (let i = 0; i < DAYS; i++) {
    running += newPerDay[i] ?? 0;
    employeesValues[i] = running;
  }

  // ---- Shifts (count per day) ----
  const shiftsValues = new Array<number>(DAYS).fill(0);
  for (const row of shiftsRows) {
    const idx = bucketKeys.indexOf(dayKey(new Date(row.shiftDate)));
    if (idx >= 0) shiftsValues[idx] = row._count._all;
  }

  // ---- Attendance (count per day) + Hours (sum hoursWorked per day) ----
  const attendanceValues = new Array<number>(DAYS).fill(0);
  const hoursValues = new Array<number>(DAYS).fill(0);
  for (const a of attendanceRows) {
    const idx = bucketKeys.indexOf(dayKey(new Date(a.checkIn)));
    if (idx < 0) continue;
    attendanceValues[idx] += 1;
    if (a.hoursWorked !== null && a.hoursWorked !== undefined) {
      hoursValues[idx] += Number(a.hoursWorked);
    }
  }

  const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
  const last = (arr: number[]): number => arr[arr.length - 1] ?? 0;

  return {
    employees: {
      values: employeesValues,
      total: last(employeesValues),
      change: computeChange(employeesValues),
    },
    shifts: {
      values: shiftsValues,
      total: sum(shiftsValues),
      change: computeChange(shiftsValues),
    },
    attendance: {
      values: attendanceValues,
      total: sum(attendanceValues),
      change: computeChange(attendanceValues),
    },
    hours: {
      values: hoursValues,
      total: Math.round(sum(hoursValues) * 10) / 10,
      change: computeChange(hoursValues),
    },
  };
}
