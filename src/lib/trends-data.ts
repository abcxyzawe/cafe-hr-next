import "server-only";
import { prisma } from "./prisma";

export type TrendPoint = {
  /** ISO week key, e.g. "2026-W18" */
  weekKey: string;
  /** Short Vietnamese label, e.g. "T18" */
  weekLabel: string;
  hours: number;
  checkins: number;
  leaves: number;
  kudos: number;
  late: number;
};

const DEFAULT_WEEKS_BACK = 12;
const LATE_THRESHOLD_MIN = 10;

/** Returns Monday 00:00 of the ISO week containing `from` (local time). */
function mondayOf(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Standard ISO-8601 week numbering algorithm (local time). */
function isoWeekParts(d: Date): { year: number; week: number } {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return { year: date.getFullYear(), week };
}

function isoWeekKey(d: Date): string {
  const { year, week } = isoWeekParts(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function isoWeekLabel(d: Date): string {
  const { week } = isoWeekParts(d);
  return `T${String(week).padStart(2, "0")}`;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseHHMMtoMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesOfDayLocal(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Returns one chronological array of {weeksBack} buckets covering the last
 * `weeksBack` ISO weeks ending with the current week.
 *
 * Strategy: pre-seed empty buckets, then run FOUR parallel range queries
 * (attendance + shifts + leave requests + activity logs) covering the entire
 * window. We bucket the rows in JavaScript rather than firing 12 queries per
 * metric. This keeps the page responsive even with months of data.
 */
export async function getPerformanceTrends(
  weeksBack: number = DEFAULT_WEEKS_BACK,
): Promise<TrendPoint[]> {
  const weeks = weeksBack > 0 ? Math.floor(weeksBack) : DEFAULT_WEEKS_BACK;

  const now = new Date();
  const currentMonday = mondayOf(now);
  const windowStart = addDays(currentMonday, -(weeks - 1) * 7);
  const windowEnd = addDays(currentMonday, 7);

  type Bucket = TrendPoint & { start: Date; end: Date };
  const buckets: Bucket[] = [];
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < weeks; i++) {
    const start = addDays(windowStart, i * 7);
    const end = addDays(start, 7);
    const point: Bucket = {
      weekKey: isoWeekKey(start),
      weekLabel: isoWeekLabel(start),
      hours: 0,
      checkins: 0,
      leaves: 0,
      kudos: 0,
      late: 0,
      start,
      end,
    };
    indexByKey.set(point.weekKey, buckets.length);
    buckets.push(point);
  }

  function bucketIndexFor(d: Date): number {
    const monday = mondayOf(d);
    const key = isoWeekKey(monday);
    const idx = indexByKey.get(key);
    return idx ?? -1;
  }

  const [attendanceRows, shiftRows, leaveRows, kudosRows] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: windowStart, lt: windowEnd } },
      select: { employeeId: true, checkIn: true, hoursWorked: true },
    }),
    prisma.shift.findMany({
      where: { shiftDate: { gte: windowStart, lt: windowEnd } },
      select: { employeeId: true, shiftDate: true, startTime: true },
    }),
    prisma.leaveRequest.findMany({
      where: { decidedAt: { gte: windowStart, lt: windowEnd } },
      select: { decidedAt: true },
    }),
    prisma.activityLog.findMany({
      where: {
        action: "kudos.give",
        createdAt: { gte: windowStart, lt: windowEnd },
      },
      select: { createdAt: true },
    }),
  ]);

  for (const a of attendanceRows) {
    const idx = bucketIndexFor(a.checkIn);
    if (idx < 0) continue;
    const bucket = buckets[idx];
    if (!bucket) continue;
    bucket.checkins += 1;
    if (a.hoursWorked !== null && a.hoursWorked !== undefined) {
      bucket.hours += Number(a.hoursWorked);
    }
  }

  for (const lr of leaveRows) {
    if (!lr.decidedAt) continue;
    const idx = bucketIndexFor(lr.decidedAt);
    if (idx < 0) continue;
    const bucket = buckets[idx];
    if (bucket) bucket.leaves += 1;
  }

  for (const k of kudosRows) {
    const idx = bucketIndexFor(k.createdAt);
    if (idx < 0) continue;
    const bucket = buckets[idx];
    if (bucket) bucket.kudos += 1;
  }

  const shiftMap = new Map<string, string>();
  for (const s of shiftRows) {
    if (!s.startTime) continue;
    const key = `${s.employeeId}|${dateKey(s.shiftDate)}`;
    const existing = shiftMap.get(key);
    if (!existing) {
      shiftMap.set(key, s.startTime);
      continue;
    }
    const prev = parseHHMMtoMinutes(existing);
    const curr = parseHHMMtoMinutes(s.startTime);
    if (prev !== null && curr !== null && curr < prev) {
      shiftMap.set(key, s.startTime);
    }
  }

  for (const a of attendanceRows) {
    const idx = bucketIndexFor(a.checkIn);
    if (idx < 0) continue;
    const key = `${a.employeeId}|${dateKey(a.checkIn)}`;
    const startStr = shiftMap.get(key);
    if (!startStr) continue;
    const startMin = parseHHMMtoMinutes(startStr);
    if (startMin === null) continue;
    const checkInMin = minutesOfDayLocal(a.checkIn);
    if (checkInMin > startMin + LATE_THRESHOLD_MIN) {
      const bucket = buckets[idx];
      if (bucket) bucket.late += 1;
    }
  }

  return buckets.map((b) => ({
    weekKey: b.weekKey,
    weekLabel: b.weekLabel,
    hours: Math.round(b.hours * 10) / 10,
    checkins: b.checkins,
    leaves: b.leaves,
    kudos: b.kudos,
    late: b.late,
  }));
}
