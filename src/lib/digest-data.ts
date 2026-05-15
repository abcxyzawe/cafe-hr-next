import "server-only";
import { prisma } from "./prisma";
import { gatherStandupFacts, getCachedStandup } from "./standup-data";
import { getTopStreaks } from "./streak-queries";

export type DigestStreak = {
  name: string;
  current: number;
  longest: number;
};

export type DigestData = {
  employeeCount: number;
  attendanceToday: number;
  openAttendance: number;
  pendingLeaves: number;
  birthdaysToday: number;
  topStreaks: DigestStreak[];
  standupSummary: string | null;
  generatedAt: Date;
};

/**
 * Gather all data required to render the daily email digest preview.
 * Each query is wrapped so a single failure doesn't break the whole page.
 */
export async function gatherDigestData(today?: Date): Promise<DigestData> {
  const now = today ?? new Date();
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

  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };

  const [
    employeeCount,
    attendanceTodayRows,
    openAttendance,
    pendingLeaves,
    employeesWithDob,
    topStreaks,
  ] = await Promise.all([
    safe(prisma.employee.count(), 0),
    safe(
      prisma.attendance.findMany({
        where: { checkIn: { gte: startOfToday, lt: startOfTomorrow } },
        select: { employeeId: true },
      }),
      [] as Array<{ employeeId: number }>,
    ),
    safe(prisma.attendance.count({ where: { checkOut: null } }), 0),
    safe(
      prisma.leaveRequest.count({ where: { status: "pending" } }),
      0,
    ),
    safe(
      prisma.employee.findMany({
        where: { dateOfBirth: { not: null } },
        select: { dateOfBirth: true },
      }),
      [] as Array<{ dateOfBirth: Date | null }>,
    ),
    safe(getTopStreaks(3), []),
  ]);

  const attendanceToday = new Set(
    attendanceTodayRows.map((r) => r.employeeId),
  ).size;

  const todayMonth = startOfToday.getMonth();
  const todayDate = startOfToday.getDate();
  const birthdaysToday = employeesWithDob.reduce((acc, e) => {
    if (!e.dateOfBirth) return acc;
    const d = new Date(e.dateOfBirth);
    return d.getMonth() === todayMonth && d.getDate() === todayDate
      ? acc + 1
      : acc;
  }, 0);

  // Standup summary: only include if cached (don't trigger AI generation here).
  const cached = getCachedStandup(startOfToday);
  let standupSummary: string | null = cached ? cached.content : null;

  // If no cached summary, build a deterministic one-line summary from facts so
  // the preview never looks empty in dev / before the morning briefing runs.
  if (!standupSummary) {
    const facts = await safe(gatherStandupFacts(startOfToday), null);
    if (facts) {
      standupSummary =
        `Hôm qua: ${facts.yesterday.checkins} check-in, ` +
        `${facts.yesterday.tasksCompleted} task hoàn thành. ` +
        `Hôm nay: ${facts.today.shiftsScheduled} ca làm, ` +
        `${facts.today.pendingTasks} task cần làm, ` +
        `${facts.today.upcomingLeaves} đơn nghỉ sắp tới.`;
    }
  }

  return {
    employeeCount,
    attendanceToday,
    openAttendance,
    pendingLeaves,
    birthdaysToday,
    topStreaks: topStreaks.map((s) => ({
      name: s.name,
      current: s.current,
      longest: s.longest,
    })),
    standupSummary,
    generatedAt: new Date(),
  };
}
