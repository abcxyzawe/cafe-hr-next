import "server-only";
import { prisma } from "./prisma";

export type PerformanceMetrics = {
  recentCheckIns: number;
  avgShiftHours: number;
  scheduled30d: number;
  attended30d: number;
  reliabilityPct: number | null;
  currentStreak: number;
  longestStreak: number;
  punctuality: { early: number; onTime: number; late: number };
};

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

function parseHHMM(t: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

export async function getPerformanceMetrics(
  employeeId: number,
): Promise<PerformanceMetrics> {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  start30.setHours(0, 0, 0, 0);
  const start90 = new Date(now);
  start90.setDate(start90.getDate() - 90);
  start90.setHours(0, 0, 0, 0);

  const [attendance30, scheduled30, attendance90] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, checkIn: { gte: start30 } },
      select: { checkIn: true, hoursWorked: true },
    }),
    prisma.shift.findMany({
      where: { employeeId, shiftDate: { gte: start30, lt: now } },
      select: { shiftDate: true, startTime: true },
    }),
    prisma.attendance.findMany({
      where: { employeeId, checkIn: { gte: start90 } },
      select: { checkIn: true },
    }),
  ]);

  const completed = attendance30.filter((a) => a.hoursWorked != null);
  const totalHours = completed.reduce(
    (acc, a) => acc + Number(a.hoursWorked ?? 0),
    0,
  );
  const avgShiftHours =
    completed.length > 0 ? totalHours / completed.length : 0;

  const attendanceByDay = new Map<string, Date>();
  for (const a of attendance30) {
    const k = dayKey(a.checkIn);
    const cur = attendanceByDay.get(k);
    if (!cur || a.checkIn < cur) attendanceByDay.set(k, a.checkIn);
  }

  let attended30d = 0;
  let early = 0;
  let onTime = 0;
  let late = 0;
  for (const s of scheduled30) {
    const k = dayKey(s.shiftDate);
    const att = attendanceByDay.get(k);
    if (!att) continue;
    attended30d++;
    const start = parseHHMM(s.startTime);
    if (!start) continue;
    const scheduledDate = new Date(s.shiftDate);
    scheduledDate.setHours(start.h, start.m, 0, 0);
    const diffMin = (att.getTime() - scheduledDate.getTime()) / 60_000;
    if (diffMin < -5) early++;
    else if (diffMin <= 10) onTime++;
    else late++;
  }
  const reliabilityPct =
    scheduled30.length === 0
      ? null
      : Math.round(Math.min(1, attended30d / scheduled30.length) * 100);

  const attendedDays = new Set<string>();
  for (const a of attendance90) attendedDays.add(dayKey(a.checkIn));

  let currentStreak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!attendedDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (attendedDays.has(dayKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longestStreak = 0;
  let run = 0;
  const c = new Date(start90);
  while (c <= now) {
    if (attendedDays.has(dayKey(c))) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
    c.setDate(c.getDate() + 1);
  }

  return {
    recentCheckIns: attendance30.length,
    avgShiftHours,
    scheduled30d: scheduled30.length,
    attended30d,
    reliabilityPct,
    currentStreak,
    longestStreak,
    punctuality: { early, onTime, late },
  };
}
