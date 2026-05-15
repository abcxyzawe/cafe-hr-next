import "server-only";

import { prisma } from "./prisma";
import { rankSwapCandidates, type SwapCandidate } from "./swap-matcher";

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeekMonday(d: Date): Date {
  const out = startOfDay(d);
  const day = out.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-first
  out.setDate(out.getDate() + diff);
  return out;
}

function toMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

type Range = { start: number; end: number; allDay: boolean };

function toRange(startTime: string | null, endTime: string | null): Range {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) {
    return { start: 0, end: 24 * 60, allDay: true };
  }
  return { start, end, allDay: false };
}

function rangesOverlap(a: Range, b: Range): boolean {
  if (a.allDay || b.allDay) return true;
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

function diffInDays(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export async function getSwapSuggestions(
  shiftId: number,
): Promise<SwapCandidate[]> {
  if (!Number.isInteger(shiftId) || shiftId <= 0) return [];

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      employeeId: true,
      shiftDate: true,
      startTime: true,
      endTime: true,
      employee: { select: { id: true, role: true } },
    },
  });
  if (!shift) return [];

  const shiftRole = shift.employee.role;

  const sameRoleEmployees = await prisma.employee.findMany({
    where: { role: shiftRole, id: { not: shift.employeeId } },
    select: { id: true, name: true, role: true, avatarUrl: true },
  });
  if (sameRoleEmployees.length === 0) return [];

  const candidateIds = sameRoleEmployees.map((e) => e.id);

  const weekStart = startOfWeekMonday(shift.shiftDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const dayStart = startOfDay(shift.shiftDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [weekAttendance, lastSeenRecords, sameDayShifts] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId: { in: candidateIds },
        checkIn: { gte: weekStart, lt: weekEnd },
      },
      select: { employeeId: true, hoursWorked: true },
    }),
    prisma.attendance.findMany({
      where: {
        employeeId: { in: candidateIds },
        checkIn: { gte: fourteenDaysAgo },
      },
      select: { employeeId: true, checkIn: true },
      orderBy: { checkIn: "desc" },
    }),
    prisma.shift.findMany({
      where: {
        employeeId: { in: candidateIds },
        shiftDate: { gte: dayStart, lt: dayEnd },
        id: { not: shift.id },
      },
      select: { employeeId: true, startTime: true, endTime: true },
    }),
  ]);

  const hoursByEmployee = new Map<number, number>();
  for (const a of weekAttendance) {
    const h = a.hoursWorked === null ? 0 : Number(a.hoursWorked);
    hoursByEmployee.set(
      a.employeeId,
      (hoursByEmployee.get(a.employeeId) ?? 0) + (Number.isFinite(h) ? h : 0),
    );
  }

  const lastSeenByEmployee = new Map<number, Date>();
  for (const a of lastSeenRecords) {
    if (!lastSeenByEmployee.has(a.employeeId)) {
      lastSeenByEmployee.set(a.employeeId, a.checkIn);
    }
  }

  const shiftRange = toRange(shift.startTime, shift.endTime);
  const conflictByEmployee = new Map<number, boolean>();
  for (const other of sameDayShifts) {
    if (conflictByEmployee.get(other.employeeId)) continue;
    const otherRange = toRange(other.startTime, other.endTime);
    if (rangesOverlap(shiftRange, otherRange)) {
      conflictByEmployee.set(other.employeeId, true);
    }
  }

  const now = new Date();

  const ranked = rankSwapCandidates({
    shift: {
      id: shift.id,
      employeeId: shift.employeeId,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
    },
    shiftRole,
    candidates: sameRoleEmployees.map((e) => {
      const lastSeen = lastSeenByEmployee.get(e.id) ?? null;
      const daysSinceLastSeen =
        lastSeen === null ? null : diffInDays(now, lastSeen);
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        avatarUrl: e.avatarUrl,
        weekHours: Math.round((hoursByEmployee.get(e.id) ?? 0) * 10) / 10,
        daysSinceLastSeen,
        hasConflictThatDay: conflictByEmployee.get(e.id) === true,
      };
    }),
  });

  return ranked;
}
