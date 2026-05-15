import "server-only";
import { prisma } from "./prisma";

export type StandupFacts = {
  yesterday: {
    checkins: number;
    tasksCompleted: number;
    leavesProcessed: number;
  };
  today: {
    shiftsScheduled: number;
    pendingTasks: number;
    upcomingLeaves: number;
  };
  alerts: {
    overdueTasks: number;
    pendingLeaves: number;
    // people still clocked in from yesterday (forgotten check-out)
    openAttendance: number;
  };
};

export type CachedStandup = {
  generatedAt: Date;
  facts: StandupFacts;
  content: string;
};

function dateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const cache = new Map<string, CachedStandup>();

export function getCachedStandup(today: Date): CachedStandup | null {
  return cache.get(dateKey(today)) ?? null;
}

export function setCachedStandup(today: Date, value: CachedStandup): void {
  // Bound memory to 16 entries; drop the oldest when we exceed.
  if (cache.size >= 16) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(dateKey(today), value);
}

/**
 * Gather operational facts for the morning standup. Each query is wrapped
 * in `safe()` so a single failing aggregate (e.g. table missing in dev DB)
 * still allows the briefing to be generated with zeros.
 */
export async function gatherStandupFacts(today: Date): Promise<StandupFacts> {
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfTomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const startOfYesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );
  const startOfNextWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7,
  );

  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };

  const [
    yCheckinRows,
    yTasksCompleted,
    yLeavesProcessed,
    tShifts,
    tPendingTasks,
    tUpcomingLeaves,
    aOverdueTasks,
    aPendingLeaves,
    aOpenAttendance,
  ] = await Promise.all([
    // Yesterday: distinct employees who checked in (any time during yesterday)
    safe(
      prisma.attendance.findMany({
        where: {
          checkIn: { gte: startOfYesterday, lt: startOfToday },
        },
        select: { employeeId: true },
      }),
      [] as Array<{ employeeId: number }>,
    ),
    // Yesterday: tasks marked completed yesterday
    safe(
      prisma.task.count({
        where: {
          completedAt: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
      0,
    ),
    // Yesterday: leave requests decided yesterday (approved or rejected)
    safe(
      prisma.leaveRequest.count({
        where: {
          decidedAt: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
      0,
    ),
    // Today: shifts scheduled today
    safe(
      prisma.shift.count({
        where: { shiftDate: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      0,
    ),
    // Today: pending (not yet completed) tasks due today or overdue
    safe(
      prisma.task.count({
        where: {
          completedAt: null,
          dueDate: { lt: startOfTomorrow },
        },
      }),
      0,
    ),
    // Today: approved leaves starting in the next 7 days (today inclusive)
    safe(
      prisma.leaveRequest.count({
        where: {
          status: "approved",
          startDate: { gte: startOfToday, lt: startOfNextWeek },
        },
      }),
      0,
    ),
    // Alerts: tasks overdue (due before today, not completed)
    safe(
      prisma.task.count({
        where: {
          completedAt: null,
          dueDate: { lt: startOfToday },
        },
      }),
      0,
    ),
    // Alerts: leave requests pending approval
    safe(
      prisma.leaveRequest.count({ where: { status: "pending" } }),
      0,
    ),
    // Alerts: attendance records from yesterday with no checkOut (forgotten)
    safe(
      prisma.attendance.count({
        where: {
          checkOut: null,
          checkIn: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
      0,
    ),
  ]);

  const checkins = new Set(yCheckinRows.map((r) => r.employeeId)).size;

  return {
    yesterday: {
      checkins,
      tasksCompleted: yTasksCompleted,
      leavesProcessed: yLeavesProcessed,
    },
    today: {
      shiftsScheduled: tShifts,
      pendingTasks: tPendingTasks,
      upcomingLeaves: tUpcomingLeaves,
    },
    alerts: {
      overdueTasks: aOverdueTasks,
      pendingLeaves: aPendingLeaves,
      openAttendance: aOpenAttendance,
    },
  };
}
