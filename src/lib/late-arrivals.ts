import "server-only";
import { prisma } from "./prisma";

export type LateRow = {
  employeeId: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  lateCount: number;
};

export type LateStats = {
  totalCheckins: number;
  lateCheckins: number;
  /** 0-100, rounded to 1 decimal */
  ratePct: number;
  /** Up to 3 employees, sorted desc by lateCount, zeros excluded */
  topLate: LateRow[];
  weekStart: Date;
  weekEnd: Date;
};

/** Threshold in minutes after scheduled start to be considered late. */
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

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Parse a "HH:MM" or "HH:MM:SS" string into minutes since midnight. */
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

export async function getLateArrivalStats(now?: Date): Promise<LateStats> {
  const baseNow = now ?? new Date();
  const weekStart = mondayOf(baseNow);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const attendance = await prisma.attendance.findMany({
    where: { checkIn: { gte: weekStart, lt: weekEnd } },
    select: { id: true, employeeId: true, checkIn: true },
  });

  if (attendance.length === 0) {
    return {
      totalCheckins: 0,
      lateCheckins: 0,
      ratePct: 0,
      topLate: [],
      weekStart,
      weekEnd,
    };
  }

  const employeeIds = Array.from(new Set(attendance.map((a) => a.employeeId)));

  const shifts = await prisma.shift.findMany({
    where: {
      employeeId: { in: employeeIds },
      shiftDate: { gte: weekStart, lt: weekEnd },
    },
    select: { employeeId: true, shiftDate: true, startTime: true },
  });

  // Map "<empId>|<YYYY-MM-DD>" -> startTime string (HH:MM)
  const shiftMap = new Map<string, string>();
  for (const s of shifts) {
    if (!s.startTime) continue;
    const key = `${s.employeeId}|${dateKey(s.shiftDate)}`;
    const existing = shiftMap.get(key);
    if (!existing) {
      shiftMap.set(key, s.startTime);
      continue;
    }
    // If multiple shifts for the same day, prefer the earliest startTime.
    const prev = parseHHMMtoMinutes(existing);
    const curr = parseHHMMtoMinutes(s.startTime);
    if (prev !== null && curr !== null && curr < prev) {
      shiftMap.set(key, s.startTime);
    }
  }

  let lateCheckins = 0;
  const lateByEmp = new Map<number, number>();

  for (const a of attendance) {
    const key = `${a.employeeId}|${dateKey(a.checkIn)}`;
    const startStr = shiftMap.get(key);
    if (!startStr) continue;
    const startMin = parseHHMMtoMinutes(startStr);
    if (startMin === null) continue;
    const checkInMin = minutesOfDayLocal(a.checkIn);
    if (checkInMin > startMin + LATE_THRESHOLD_MIN) {
      lateCheckins++;
      lateByEmp.set(a.employeeId, (lateByEmp.get(a.employeeId) ?? 0) + 1);
    }
  }

  const totalCheckins = attendance.length;
  const ratePct =
    totalCheckins === 0
      ? 0
      : Math.round((lateCheckins / totalCheckins) * 1000) / 10;

  const topIds = Array.from(lateByEmp.entries())
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  let topLate: LateRow[] = [];
  if (topIds.length > 0) {
    const emps = await prisma.employee.findMany({
      where: { id: { in: topIds } },
      select: { id: true, name: true, avatarUrl: true, role: true },
    });
    const empMap = new Map(emps.map((e) => [e.id, e]));
    topLate = topIds.flatMap<LateRow>((id) => {
      const e = empMap.get(id);
      if (!e) return [];
      return [
        {
          employeeId: e.id,
          name: e.name,
          avatarUrl: e.avatarUrl,
          role: e.role,
          lateCount: lateByEmp.get(id) ?? 0,
        },
      ];
    });
  }

  return {
    totalCheckins,
    lateCheckins,
    ratePct,
    topLate,
    weekStart,
    weekEnd,
  };
}
