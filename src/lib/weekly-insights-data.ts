import "server-only";

import { prisma } from "@/lib/prisma";

export type WeeklyFacts = {
  /** "DD/MM - DD/MM/YYYY" */
  weekRange: string;
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  totalShifts: number;
  /** % of shifts that have a matching attendance row */
  attendanceRate: number;
  kudosCount: number;
  leavesProcessed: number;
  topPerformers: Array<{ employeeId: number; name: string; hours: number }>;
};

export type CachedInsights = {
  generatedAt: Date;
  content: string;
};

const MAX_CACHE_ENTRIES = 8;
const cache = new Map<string, CachedInsights>();

/**
 * Compute the start of the week (Monday 00:00 local) covering `today`.
 * Window is the past 7 days ending the following Monday (exclusive),
 * i.e. Monday → Sunday inclusive of the week that contains today.
 */
function startOfWeekMonday(today: Date): Date {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeekSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatRange(start: Date, end: Date): string {
  return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)} - ${pad2(end.getDate())}/${pad2(end.getMonth() + 1)}/${end.getFullYear()}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * ISO week key: YYYY-Www. Used as cache key so each week gets its own slot.
 */
export function weekKey(today: Date): string {
  // ISO week algorithm
  const d = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

export function getCachedInsights(key: string): CachedInsights | null {
  return cache.get(key) ?? null;
}

export function setCachedInsights(key: string, value: CachedInsights): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

export async function gatherWeeklyFacts(today?: Date): Promise<WeeklyFacts> {
  const now = today ?? new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = endOfWeekSunday(weekStart);
  // Exclusive upper bound for half-open ranges
  const weekEndExclusive = new Date(weekStart);
  weekEndExclusive.setDate(weekEndExclusive.getDate() + 7);

  const [
    attendanceRows,
    shiftsRows,
    kudosCount,
    leavesProcessed,
    hoursGroup,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: weekStart, lt: weekEndExclusive } },
      select: { employeeId: true, checkIn: true, hoursWorked: true },
    }),
    prisma.shift.findMany({
      where: { shiftDate: { gte: weekStart, lt: weekEndExclusive } },
      select: { id: true, employeeId: true, shiftDate: true },
    }),
    prisma.activityLog.count({
      where: {
        action: "kudos.give",
        createdAt: { gte: weekStart, lt: weekEndExclusive },
      },
    }),
    prisma.leaveRequest.count({
      where: { decidedAt: { gte: weekStart, lt: weekEndExclusive } },
    }),
    prisma.attendance.groupBy({
      by: ["employeeId"],
      where: {
        checkIn: { gte: weekStart, lt: weekEndExclusive },
        checkOut: { not: null },
      },
      _sum: { hoursWorked: true },
    }),
  ]);

  // Total hours = sum of attendance.hoursWorked in window
  let totalHours = 0;
  for (const a of attendanceRows) {
    totalHours += Number(a.hoursWorked ?? 0);
  }
  totalHours = Math.round(totalHours * 100) / 100;

  // Attendance rate = % of scheduled shifts that have a matching attendance row
  // (same employeeId on same calendar day).
  const attendedKeys = new Set<string>();
  for (const a of attendanceRows) {
    attendedKeys.add(`${a.employeeId}|${dayKey(a.checkIn)}`);
  }
  let attendedShifts = 0;
  for (const s of shiftsRows) {
    if (attendedKeys.has(`${s.employeeId}|${dayKey(s.shiftDate)}`)) {
      attendedShifts++;
    }
  }
  const totalShifts = shiftsRows.length;
  const attendanceRate =
    totalShifts === 0
      ? 0
      : Math.round((attendedShifts / totalShifts) * 100);

  // Top 3 performers by hours
  const ranked = hoursGroup
    .map((g) => ({
      employeeId: g.employeeId,
      hours: Math.round(Number(g._sum.hoursWorked ?? 0) * 100) / 100,
    }))
    .filter((g) => g.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  let topPerformers: Array<{
    employeeId: number;
    name: string;
    hours: number;
  }> = [];
  if (ranked.length > 0) {
    const employees = await prisma.employee.findMany({
      where: { id: { in: ranked.map((r) => r.employeeId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(employees.map((e) => [e.id, e.name]));
    topPerformers = ranked.map((r) => ({
      employeeId: r.employeeId,
      name: nameMap.get(r.employeeId) ?? `#${r.employeeId}`,
      hours: r.hours,
    }));
  }

  return {
    weekRange: formatRange(weekStart, weekEnd),
    weekStart,
    weekEnd,
    totalHours,
    totalShifts,
    attendanceRate,
    kudosCount,
    leavesProcessed,
    topPerformers,
  };
}
