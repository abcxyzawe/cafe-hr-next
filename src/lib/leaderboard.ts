import "server-only";
import { prisma } from "./prisma";

export type LeaderboardEntry = {
  employeeId: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  hours: number;
  shifts: number;
  reliabilityPct: number | null;
  tasksDone: number;
};

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

/**
 * Top N employees by total hours worked this calendar month.
 * Aggregates from Attendance records (completed only).
 * Each entry is enriched with reliability% (last 30 days) and tasks
 * completed this month for client-side sort mode toggling.
 */
export async function getTopPerformersThisMonth(
  limit = 5,
): Promise<LeaderboardEntry[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const grouped = await prisma.attendance.groupBy({
    by: ["employeeId"],
    where: {
      checkIn: { gte: monthStart, lt: nextMonth },
      checkOut: { not: null },
    },
    _sum: { hoursWorked: true },
    _count: { _all: true },
  });

  if (grouped.length === 0) return [];

  // Sort by hours desc, take top N
  const ranked = grouped
    .map((g) => ({
      employeeId: g.employeeId,
      hours: Number(g._sum.hoursWorked ?? 0),
      shifts: g._count._all,
    }))
    .filter((g) => g.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const ids = ranked.map((r) => r.employeeId);

  // Reliability window: last 30 days
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  start30.setHours(0, 0, 0, 0);

  // Parallel fan-out: 4 wide queries instead of N*round-trips.
  const [employees, taskGroups, scheduled30, attendance30] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, avatarUrl: true, role: true },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        assigneeId: { in: ids },
        completedAt: { gte: monthStart, lt: nextMonth },
      },
      _count: { _all: true },
    }),
    prisma.shift.findMany({
      where: { employeeId: { in: ids }, shiftDate: { gte: start30, lt: now } },
      select: { employeeId: true, shiftDate: true },
    }),
    prisma.attendance.findMany({
      where: { employeeId: { in: ids }, checkIn: { gte: start30 } },
      select: { employeeId: true, checkIn: true },
    }),
  ]);

  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  const tasksByEmployee = new Map<number, number>();
  for (const t of taskGroups) {
    tasksByEmployee.set(t.assigneeId, t._count._all);
  }

  // Build per-employee attendance day-set for the 30d window
  const attendedDaysByEmployee = new Map<number, Set<string>>();
  for (const a of attendance30) {
    let set = attendedDaysByEmployee.get(a.employeeId);
    if (!set) {
      set = new Set<string>();
      attendedDaysByEmployee.set(a.employeeId, set);
    }
    set.add(dayKey(a.checkIn));
  }

  // Tally scheduled vs attended per employee
  type ReliabilityBucket = { scheduled: number; attended: number };
  const reliabilityByEmployee = new Map<number, ReliabilityBucket>();
  for (const id of ids) {
    reliabilityByEmployee.set(id, { scheduled: 0, attended: 0 });
  }
  for (const s of scheduled30) {
    const bucket = reliabilityByEmployee.get(s.employeeId);
    if (!bucket) continue;
    bucket.scheduled++;
    const days = attendedDaysByEmployee.get(s.employeeId);
    if (days && days.has(dayKey(s.shiftDate))) bucket.attended++;
  }

  const out: LeaderboardEntry[] = [];
  for (const r of ranked) {
    const emp = employeeMap.get(r.employeeId);
    if (!emp) continue;
    const bucket = reliabilityByEmployee.get(r.employeeId);
    const reliabilityPct =
      !bucket || bucket.scheduled === 0
        ? null
        : Math.round(
            Math.min(1, bucket.attended / bucket.scheduled) * 100,
          );
    out.push({
      employeeId: r.employeeId,
      name: emp.name,
      avatarUrl: emp.avatarUrl,
      role: emp.role as string,
      hours: r.hours,
      shifts: r.shifts,
      reliabilityPct,
      tasksDone: tasksByEmployee.get(r.employeeId) ?? 0,
    });
  }
  return out;
}
