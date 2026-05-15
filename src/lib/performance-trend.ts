import "server-only";
import { prisma } from "./prisma";

export type MonthlyTrendPoint = {
  month: string;
  hours: number;
  reliability: number | null;
  punctuality: number | null;
};

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month0: number): string {
  // month0 is 0-based; display as MM/YY
  return `${String(month0 + 1).padStart(2, "0")}/${String(year % 100).padStart(2, "0")}`;
}

function parseHHMM(t: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

export async function getPerformanceTrend(
  employeeId: number,
  months = 6,
): Promise<MonthlyTrendPoint[]> {
  const now = new Date();

  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
    0,
    0,
    0,
    0,
  );
  const windowEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );

  const [attendance, shifts] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId,
        checkIn: { gte: windowStart, lt: windowEnd },
      },
      select: { checkIn: true, hoursWorked: true },
    }),
    prisma.shift.findMany({
      where: {
        employeeId,
        shiftDate: { gte: windowStart, lt: windowEnd },
      },
      select: { shiftDate: true, startTime: true },
    }),
  ]);

  type Bucket = {
    year: number;
    month0: number;
    hours: number;
    scheduled: number;
    attended: number;
    onTime: number;
  };
  const buckets = new Map<string, Bucket>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, {
      year: d.getFullYear(),
      month0: d.getMonth(),
      hours: 0,
      scheduled: 0,
      attended: 0,
      onTime: 0,
    });
  }

  // Earliest attendance per day for matching against shifts; also accumulate hours.
  const attendanceByDay = new Map<string, Date>();
  for (const a of attendance) {
    const ci = a.checkIn;
    const mKey = monthKey(ci);
    const bucket = buckets.get(mKey);
    if (bucket) {
      bucket.hours += Number(a.hoursWorked ?? 0);
    }
    const k = dayKey(ci);
    const cur = attendanceByDay.get(k);
    if (!cur || ci < cur) attendanceByDay.set(k, ci);
  }

  for (const s of shifts) {
    const mKey = monthKey(s.shiftDate);
    const bucket = buckets.get(mKey);
    if (!bucket) continue;
    bucket.scheduled++;
    const att = attendanceByDay.get(dayKey(s.shiftDate));
    if (!att) continue;
    bucket.attended++;
    const start = parseHHMM(s.startTime);
    if (!start) continue;
    const scheduledDate = new Date(s.shiftDate);
    scheduledDate.setHours(start.h, start.m, 0, 0);
    const diffMin = (att.getTime() - scheduledDate.getTime()) / 60_000;
    if (diffMin >= -5 && diffMin <= 10) bucket.onTime++;
  }

  const result: MonthlyTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const b = buckets.get(key);
    if (!b) continue;
    const reliability =
      b.scheduled === 0
        ? null
        : Math.round(Math.min(1, b.attended / b.scheduled) * 100);
    const punctuality =
      b.attended === 0 ? null : Math.round((b.onTime / b.attended) * 100);
    result.push({
      month: monthLabel(b.year, b.month0),
      hours: Number(b.hours.toFixed(2)),
      reliability,
      punctuality,
    });
  }

  return result;
}
