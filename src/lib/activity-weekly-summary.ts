import "server-only";
import { prisma } from "./prisma";

export type WeekSummary = {
  weekStartIso: string;
  weekEndIso: string;
  /** Inclusive day count = 7 */
  totals: {
    checkIns: number;
    leaveCreated: number;
    leaveDecided: number;
    taskCompleted: number;
    kudosGiven: number;
    employeesCreated: number;
    shiftsScheduled: number;
  };
  /** Top 3 actors by activity count this week (excluding system events). */
  topActors: Array<{ id: number; name: string; count: number }>;
  /** Days with the most activity (top 3). */
  busiestDays: Array<{ iso: string; count: number }>;
  /** Whether the week was busier than the previous week (week-over-week delta %). */
  weekOverWeekPct: number | null;
};

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getWeeklySummary(): Promise<WeekSummary> {
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const prevStart = new Date(weekStart);
  prevStart.setDate(prevStart.getDate() - 7);

  const [thisWeekLogs, lastWeekCount] = await Promise.all([
    prisma.activityLog.findMany({
      where: { createdAt: { gte: weekStart, lt: weekEnd } },
      select: {
        action: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.activityLog.count({
      where: { createdAt: { gte: prevStart, lt: weekStart } },
    }),
  ]);

  const totals = {
    checkIns: 0,
    leaveCreated: 0,
    leaveDecided: 0,
    taskCompleted: 0,
    kudosGiven: 0,
    employeesCreated: 0,
    shiftsScheduled: 0,
  };
  const actorMap = new Map<number, { name: string; count: number }>();
  const dayMap = new Map<string, number>();

  for (const l of thisWeekLogs) {
    if (l.action === "attendance.checkin") totals.checkIns++;
    else if (l.action === "leave.create") totals.leaveCreated++;
    else if (l.action === "leave.approve" || l.action === "leave.reject")
      totals.leaveDecided++;
    else if (l.action === "task.complete") totals.taskCompleted++;
    else if (l.action === "kudos.give") totals.kudosGiven++;
    else if (l.action === "employee.create") totals.employeesCreated++;
    else if (l.action === "shift.create") totals.shiftsScheduled++;

    if (l.user) {
      const cur = actorMap.get(l.user.id);
      if (cur) cur.count++;
      else actorMap.set(l.user.id, { name: l.user.name, count: 1 });
    }
    const iso = localIso(new Date(l.createdAt));
    dayMap.set(iso, (dayMap.get(iso) ?? 0) + 1);
  }

  const topActors = Array.from(actorMap.entries())
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const busiestDays = Array.from(dayMap.entries())
    .map(([iso, count]) => ({ iso, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const thisWeekTotal = thisWeekLogs.length;
  const weekOverWeekPct =
    lastWeekCount === 0
      ? null
      : Math.round(((thisWeekTotal - lastWeekCount) / lastWeekCount) * 100);

  return {
    weekStartIso: localIso(weekStart),
    weekEndIso: localIso(new Date(weekEnd.getTime() - 86_400_000)),
    totals,
    topActors,
    busiestDays,
    weekOverWeekPct,
  };
}
