import "server-only";
import { prisma } from "./prisma";
import { computeStreak } from "./streak";
import { generateEotdCongrats } from "./xai";

export type EotdCandidate = {
  employeeId: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  monthHours: number;
  streak: number;
  kudosCount: number;
  lateCount: number;
  score: number;
};

export type EotdResult = {
  generatedAt: Date;
  winner: EotdCandidate;
  /** Top 4 candidates immediately below the winner. */
  runnersUp: EotdCandidate[];
  /** AI-generated short Vietnamese congratulation. */
  message: string;
};

/* ----------------------------- cache ----------------------------- */

const MAX_CACHE_ENTRIES = 8;
const cache = new Map<string, EotdResult>();

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getCachedEotd(today: Date): EotdResult | null {
  return cache.get(dayKeyOf(today)) ?? null;
}

export function setCachedEotd(today: Date, value: EotdResult): void {
  const key = dayKeyOf(today);
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/* ----------------------------- helpers ----------------------------- */

const LATE_THRESHOLD_MIN = 10;

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

/* ----------------------------- main ----------------------------- */

export async function pickEmployeeOfTheDay(): Promise<EotdResult | null> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, role: true, avatarUrl: true },
  });
  if (employees.length === 0) return null;

  const ids = employees.map((e) => e.id);

  const [monthAttendance, allAttendance, monthShifts, kudos] =
    await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId: { in: ids },
          checkIn: { gte: monthStart, lt: nextMonth },
        },
        select: { employeeId: true, checkIn: true, hoursWorked: true },
      }),
      prisma.attendance.findMany({
        where: { employeeId: { in: ids } },
        select: { employeeId: true, checkIn: true },
      }),
      prisma.shift.findMany({
        where: {
          employeeId: { in: ids },
          shiftDate: { gte: monthStart, lt: nextMonth },
        },
        select: { employeeId: true, shiftDate: true, startTime: true },
      }),
      prisma.activityLog.groupBy({
        by: ["entityId"],
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: { in: ids },
          createdAt: { gte: monthStart, lt: nextMonth },
        },
        _count: { _all: true },
      }),
    ]);

  // Hours per employee this month
  const monthHoursMap = new Map<number, number>();
  for (const a of monthAttendance) {
    monthHoursMap.set(
      a.employeeId,
      (monthHoursMap.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0),
    );
  }

  // Streak per employee from full attendance history
  const checkInsByEmp = new Map<number, Date[]>();
  for (const id of ids) checkInsByEmp.set(id, []);
  for (const a of allAttendance) {
    checkInsByEmp.get(a.employeeId)?.push(a.checkIn);
  }
  const streakMap = new Map<number, number>();
  for (const id of ids) {
    const list = checkInsByEmp.get(id) ?? [];
    streakMap.set(id, computeStreak(list, now).currentStreak);
  }

  // Kudos per employee this month
  const kudosMap = new Map<number, number>();
  for (const k of kudos) {
    if (k.entityId == null) continue;
    kudosMap.set(k.entityId, k._count._all);
  }

  // Late count per employee this month (mirrors late-arrivals.ts logic)
  const shiftMap = new Map<string, string>();
  for (const s of monthShifts) {
    if (!s.startTime) continue;
    const key = `${s.employeeId}|${dayKeyOf(s.shiftDate)}`;
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
  const lateMap = new Map<number, number>();
  for (const a of monthAttendance) {
    const key = `${a.employeeId}|${dayKeyOf(a.checkIn)}`;
    const startStr = shiftMap.get(key);
    if (!startStr) continue;
    const startMin = parseHHMMtoMinutes(startStr);
    if (startMin === null) continue;
    if (minutesOfDayLocal(a.checkIn) > startMin + LATE_THRESHOLD_MIN) {
      lateMap.set(a.employeeId, (lateMap.get(a.employeeId) ?? 0) + 1);
    }
  }

  // Build candidates + score
  const candidates: EotdCandidate[] = employees.map((e) => {
    const monthHours = Math.round((monthHoursMap.get(e.id) ?? 0) * 100) / 100;
    const streak = streakMap.get(e.id) ?? 0;
    const kudosCount = kudosMap.get(e.id) ?? 0;
    const lateCount = lateMap.get(e.id) ?? 0;
    const raw = monthHours + streak * 5 + kudosCount * 10 - lateCount * 8;
    const score = Math.round(Math.max(0, raw) * 100) / 100;
    return {
      employeeId: e.id,
      name: e.name,
      role: e.role as string,
      avatarUrl: e.avatarUrl,
      monthHours,
      streak,
      kudosCount,
      lateCount,
      score,
    };
  });

  const ranked = candidates
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;

  const winner = ranked[0];
  const runnersUp = ranked.slice(1, 5);

  let message = "";
  try {
    const congrats = await generateEotdCongrats({
      name: winner.name,
      role: winner.role,
      score: winner.score,
    });
    message = congrats.message;
  } catch {
    message = `Chúc mừng ${winner.name}! Bạn là nhân viên xuất sắc nhất hôm nay với điểm số ${winner.score}. Cả nhà cùng vỗ tay nào!`;
  }

  return {
    generatedAt: now,
    winner,
    runnersUp,
    message,
  };
}
