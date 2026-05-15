import "server-only";
import { prisma } from "./prisma";
import { computeStreak } from "./streak";
import {
  ACHIEVEMENTS,
  TIER_WEIGHT,
  computeEarned,
  getAchievement,
  type AchievementKey,
  type EmployeeFacts,
} from "./achievements";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ISO week key (e.g. "2026-W20") in local time. Standard ISO-8601 algorithm.
 */
function isoWeekKey(d: Date): string {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function parseHHMM(t: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

/* ------------------------------------------------------------------ */
/* Per-employee facts builder                                          */
/* ------------------------------------------------------------------ */

type EmpRow = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

type AttendanceRow = {
  employeeId: number;
  checkIn: Date;
  checkOut: Date | null;
};

type ShiftRow = {
  employeeId: number;
  shiftDate: Date;
  startTime: string | null;
};

function buildFacts(
  attendance: AttendanceRow[],
  shifts: ShiftRow[],
  kudosCount: number,
  monthRange: { start: Date; end: Date },
): EmployeeFacts {
  const completedAttendance = attendance.filter((a) => a.checkOut !== null);
  const completedShifts = completedAttendance.length;

  const weeksThisMonth = new Set<string>();
  for (const a of attendance) {
    if (a.checkIn >= monthRange.start && a.checkIn < monthRange.end) {
      weeksThisMonth.add(isoWeekKey(a.checkIn));
    }
  }

  const streak = computeStreak(attendance.map((a) => a.checkIn));

  const firstByDay = new Map<string, Date>();
  for (const a of attendance) {
    const k = localDayKey(a.checkIn);
    const cur = firstByDay.get(k);
    if (!cur || a.checkIn < cur) firstByDay.set(k, a.checkIn);
  }
  const completedDays = new Set<string>();
  for (const a of attendance) {
    if (a.checkOut !== null) completedDays.add(localDayKey(a.checkIn));
  }

  let earlyOnTimeShifts = 0;
  let eveningCompletedShifts = 0;
  for (const s of shifts) {
    const start = parseHHMM(s.startTime);
    if (!start) continue;

    const dayK = localDayKey(s.shiftDate);

    if (start.h < 8) {
      const att = firstByDay.get(dayK);
      if (!att) continue;
      const scheduled = new Date(s.shiftDate);
      scheduled.setHours(start.h, start.m, 0, 0);
      const diffMin = (att.getTime() - scheduled.getTime()) / 60_000;
      if (diffMin <= 10) earlyOnTimeShifts++;
    } else if (start.h >= 17) {
      if (completedDays.has(dayK)) eveningCompletedShifts++;
    }
  }

  return {
    completedShifts,
    weeksThisMonth,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    earlyOnTimeShifts,
    eveningCompletedShifts,
    kudosCount,
  };
}

function currentMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function getEarnedBadges(
  employeeId: number,
): Promise<AchievementKey[]> {
  const monthRange = currentMonthRange();

  const [attendance, shifts, kudosCount] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId },
      select: { employeeId: true, checkIn: true, checkOut: true },
    }),
    prisma.shift.findMany({
      where: { employeeId },
      select: { employeeId: true, shiftDate: true, startTime: true },
    }),
    prisma.activityLog.count({
      where: {
        action: "kudos.give",
        entityType: "employee",
        entityId: employeeId,
      },
    }),
  ]);

  const facts = buildFacts(attendance, shifts, kudosCount, monthRange);
  return computeEarned(facts);
}

export type RecentEarner = {
  employeeId: number;
  name: string;
  avatarUrl: string | null;
  earned: AchievementKey[];
  /** Heuristic: highest-tier badge earned (no earned-at column exists). */
  newest: AchievementKey;
};

export async function getRecentBadgeEarners(
  limit: number = 6,
): Promise<RecentEarner[]> {
  const monthRange = currentMonthRange();

  const employees: EmpRow[] = await prisma.employee.findMany({
    select: { id: true, name: true, avatarUrl: true },
  });
  if (employees.length === 0) return [];

  const ids = employees.map((e) => e.id);

  const [attendance, shifts, kudos] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: { in: ids } },
      select: { employeeId: true, checkIn: true, checkOut: true },
    }),
    prisma.shift.findMany({
      where: { employeeId: { in: ids } },
      select: { employeeId: true, shiftDate: true, startTime: true },
    }),
    prisma.activityLog.findMany({
      where: {
        action: "kudos.give",
        entityType: "employee",
        entityId: { in: ids },
      },
      select: { entityId: true },
    }),
  ]);

  const attByEmp = new Map<number, AttendanceRow[]>();
  const shiftsByEmp = new Map<number, ShiftRow[]>();
  const kudosByEmp = new Map<number, number>();
  for (const id of ids) {
    attByEmp.set(id, []);
    shiftsByEmp.set(id, []);
    kudosByEmp.set(id, 0);
  }
  for (const a of attendance) attByEmp.get(a.employeeId)?.push(a);
  for (const s of shifts) shiftsByEmp.get(s.employeeId)?.push(s);
  for (const k of kudos) {
    if (k.entityId == null) continue;
    kudosByEmp.set(k.entityId, (kudosByEmp.get(k.entityId) ?? 0) + 1);
  }

  const order = new Map<AchievementKey, number>();
  ACHIEVEMENTS.forEach((a, i) => order.set(a.key, i));

  const out: RecentEarner[] = [];
  for (const emp of employees) {
    const facts = buildFacts(
      attByEmp.get(emp.id) ?? [],
      shiftsByEmp.get(emp.id) ?? [],
      kudosByEmp.get(emp.id) ?? 0,
      monthRange,
    );
    const earned = computeEarned(facts);
    if (earned.length === 0) continue;

    let newest: AchievementKey = earned[0];
    let bestScore = -1;
    for (const k of earned) {
      const def = getAchievement(k);
      if (!def) continue;
      const score = TIER_WEIGHT[def.tier] * 100 + (order.get(k) ?? 0);
      if (score > bestScore) {
        bestScore = score;
        newest = k;
      }
    }

    out.push({
      employeeId: emp.id,
      name: emp.name,
      avatarUrl: emp.avatarUrl,
      earned,
      newest,
    });
  }

  out.sort((a, b) => {
    if (b.earned.length !== a.earned.length) {
      return b.earned.length - a.earned.length;
    }
    return a.name.localeCompare(b.name);
  });

  return out.slice(0, Math.max(0, limit));
}
