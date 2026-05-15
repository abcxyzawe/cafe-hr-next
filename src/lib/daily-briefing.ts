import "server-only";
import { prisma } from "./prisma";

export type BriefingFacts = {
  pendingLeaves: number;
  openAttendance: number;
  overdueTasks: number;
  birthdaysToday: number;
  shiftsToday: number;
  unfilledShiftSlots: number;
};

export type DailyBriefing = {
  content: string;
  model: string;
  generatedAt: Date;
  facts: BriefingFacts;
};

function dateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const cache = new Map<string, DailyBriefing>();

export function getCachedBriefing(today: Date): DailyBriefing | null {
  return cache.get(dateKey(today)) ?? null;
}

export function setCachedBriefing(today: Date, b: DailyBriefing): void {
  // Trim old entries to keep memory bounded
  if (cache.size > 32) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(dateKey(today), b);
}

/**
 * Gather operational facts for today. Each query is independently safe:
 * if a single count throws (e.g. schema/data issue) we return 0 for that field
 * so the briefing can still be generated.
 */
export async function gatherFacts(): Promise<BriefingFacts> {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfNextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };

  const [
    pendingLeaves,
    openAttendance,
    overdueTasks,
    shiftsToday,
    employees,
  ] = await Promise.all([
    safe(prisma.leaveRequest.count({ where: { status: "pending" } }), 0),
    safe(prisma.attendance.count({ where: { checkOut: null } }), 0),
    safe(
      prisma.task.count({
        where: {
          dueDate: { lt: startOfDay },
          completedAt: null,
        },
      }),
      0,
    ),
    safe(
      prisma.shift.count({
        where: {
          shiftDate: { gte: startOfDay, lt: startOfNextDay },
        },
      }),
      0,
    ),
    safe(
      prisma.employee.findMany({ select: { dateOfBirth: true } }),
      [] as Array<{ dateOfBirth: Date | null }>,
    ),
  ]);

  const birthdaysToday = employees.reduce((acc, e) => {
    const dob = e.dateOfBirth;
    if (!dob) return acc;
    const m = dob.getMonth();
    const d = dob.getDate();
    return m === now.getMonth() && d === now.getDate() ? acc + 1 : acc;
  }, 0);

  // Simple heuristic for unfilled shifts: target 3 shifts/day; missing = max(0, 3 - actual)
  const TARGET_SHIFTS = 3;
  const unfilledShiftSlots = Math.max(0, TARGET_SHIFTS - shiftsToday);

  return {
    pendingLeaves,
    openAttendance,
    overdueTasks,
    birthdaysToday,
    shiftsToday,
    unfilledShiftSlots,
  };
}
