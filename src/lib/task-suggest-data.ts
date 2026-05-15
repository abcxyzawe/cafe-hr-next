import "server-only";
import { prisma } from "./prisma";

export type SuggesterFacts = {
  employeesByRole: Record<string, number>;
  shiftsToday: number;
  attendanceTodayCount: number;
  openAttendance: number;
  overdueTasksCount: number;
  pendingLeavesCount: number;
  birthdaysToday: number;
  recentKudosCount: number;
};

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/**
 * Gather operational facts used by the AI task suggester. Each query is
 * wrapped in `safe()` so a single failing aggregate (e.g. table missing in
 * dev DB) still allows suggestions to be generated with zeros.
 */
export async function gatherSuggesterFacts(): Promise<SuggesterFacts> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  // Recent kudos = positive employee notes in the last 7 days (proxy)
  const startOfRecent = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 7,
  );

  const [
    employeesByRoleRows,
    shiftsToday,
    attendanceTodayCount,
    openAttendance,
    overdueTasksCount,
    pendingLeavesCount,
    employees,
    recentKudosCount,
  ] = await Promise.all([
    safe(
      prisma.employee.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      [] as Array<{ role: string; _count: { _all: number } }>,
    ),
    safe(
      prisma.shift.count({
        where: { shiftDate: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      0,
    ),
    safe(
      prisma.attendance.count({
        where: { checkIn: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      0,
    ),
    safe(
      prisma.attendance.count({
        where: {
          checkOut: null,
          checkIn: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
      0,
    ),
    safe(
      prisma.task.count({
        where: { completedAt: null, dueDate: { lt: startOfToday } },
      }),
      0,
    ),
    safe(
      prisma.leaveRequest.count({ where: { status: "pending" } }),
      0,
    ),
    safe(
      prisma.employee.findMany({ select: { dateOfBirth: true } }),
      [] as Array<{ dateOfBirth: Date | null }>,
    ),
    safe(
      prisma.employeeNote.count({
        where: { createdAt: { gte: startOfRecent } },
      }),
      0,
    ),
  ]);

  const employeesByRole: Record<string, number> = {};
  for (const row of employeesByRoleRows) {
    const r = row as { role: unknown; _count: { _all: number } };
    const key = typeof r.role === "string" ? r.role : String(r.role);
    employeesByRole[key] = r._count._all;
  }

  const birthdaysToday = employees.reduce((acc, e) => {
    const dob = e.dateOfBirth;
    if (!dob) return acc;
    return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate()
      ? acc + 1
      : acc;
  }, 0);

  return {
    employeesByRole,
    shiftsToday,
    attendanceTodayCount,
    openAttendance,
    overdueTasksCount,
    pendingLeavesCount,
    birthdaysToday,
    recentKudosCount,
  };
}
