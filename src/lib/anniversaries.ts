import { prisma } from "./prisma";

export type WorkAnniversary = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: Date;
  yearsCount: number;
};

/**
 * Find employees whose createdAt month + day matches today AND year < this year.
 * Returns Vietnamese-friendly anniversary records.
 */
export async function getTodayAnniversaries(): Promise<WorkAnniversary[]> {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const todayM = now.getMonth();
  const todayD = now.getDate();
  const todayY = now.getFullYear();

  return employees
    .filter((e) => {
      const d = new Date(e.createdAt);
      return (
        d.getMonth() === todayM &&
        d.getDate() === todayD &&
        d.getFullYear() < todayY
      );
    })
    .map((e) => ({
      id: e.id,
      name: e.name,
      avatarUrl: e.avatarUrl,
      role: e.role,
      joinedAt: e.createdAt,
      yearsCount: todayY - new Date(e.createdAt).getFullYear(),
    }))
    .sort((a, b) => b.yearsCount - a.yearsCount);
}

export type UpcomingAnniversary = WorkAnniversary & {
  daysAhead: number;
  upcomingDate: Date;
};

/**
 * Find employees whose work anniversary falls within the next `daysAhead` days
 * (excluding today, which is covered by getTodayAnniversaries).
 *
 * The next anniversary date is computed from createdAt's month + day, rolled
 * forward to this year (or next year if already past). Employees who joined in
 * the current calendar year are skipped — their first anniversary hasn't come
 * yet.
 */
export async function getUpcomingAnniversaries(
  daysAhead = 30,
  max = 5,
): Promise<UpcomingAnniversary[]> {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayY = today.getFullYear();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const items: UpcomingAnniversary[] = [];

  for (const e of employees) {
    const joined = new Date(e.createdAt);
    const joinedY = joined.getFullYear();
    const joinedM = joined.getMonth();
    const joinedD = joined.getDate();

    // Build this year's anniversary date at local midnight
    let upcoming = new Date(todayY, joinedM, joinedD);
    let upcomingYear = todayY;
    if (upcoming.getTime() < today.getTime()) {
      upcoming = new Date(todayY + 1, joinedM, joinedD);
      upcomingYear = todayY + 1;
    }

    // Skip if this would be year 0 (joined this calendar year, no anniversary yet)
    if (upcomingYear === joinedY) continue;

    const daysUntil = Math.round(
      (upcoming.getTime() - today.getTime()) / MS_PER_DAY,
    );

    // Skip today (covered elsewhere) and out-of-window
    if (daysUntil <= 0 || daysUntil > daysAhead) continue;

    items.push({
      id: e.id,
      name: e.name,
      avatarUrl: e.avatarUrl,
      role: e.role,
      joinedAt: e.createdAt,
      yearsCount: upcomingYear - joinedY,
      daysAhead: daysUntil,
      upcomingDate: upcoming,
    });
  }

  items.sort((a, b) => a.daysAhead - b.daysAhead);
  return items.slice(0, max);
}
