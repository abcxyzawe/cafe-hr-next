export type TenureMilestone = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  yearsAt: number; // milestone year (1, 2, 3, 5, 10)
  anniversaryDate: Date; // upcoming date
  daysUntil: number;
};

export const MILESTONE_YEARS = [1, 2, 3, 5, 10] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Vietnamese-friendly tenure label: "X năm Y tháng".
 * - Omits "0 năm" → shows "Y tháng" only.
 * - Omits "0 tháng" → shows "X năm" only.
 * - For < 1 month, returns "Mới gia nhập".
 */
export function tenureLabel(start: Date, today?: Date): string {
  const now = today ?? new Date();
  const s = new Date(start);

  let years = now.getFullYear() - s.getFullYear();
  let months = now.getMonth() - s.getMonth();
  let days = now.getDate() - s.getDate();

  if (days < 0) {
    months -= 1;
    // Compute days in previous month for borrow
    const prev = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) {
    return "Mới gia nhập";
  }
  if (years <= 0) {
    return `${months} tháng`;
  }
  if (months <= 0) {
    return `${years} năm`;
  }
  return `${years} năm ${months} tháng`;
}

/**
 * Compute upcoming milestone anniversaries (1/2/3/5/10 years) within `daysAhead` days.
 * - For each employee, compute this year's anniversary; if past, roll to next year.
 * - Include if the year-count at that anniversary is in MILESTONE_YEARS AND the
 *   anniversary is within the window.
 * - Sorted by daysUntil ascending.
 */
export function computeUpcomingMilestones(
  employees: Array<{
    id: number;
    name: string;
    role: string;
    avatarUrl: string | null;
    createdAt: Date;
  }>,
  daysAhead: number = 30,
  today?: Date,
): TenureMilestone[] {
  const now = today ?? new Date();
  const todayMid = startOfDay(now);
  const todayY = todayMid.getFullYear();

  const milestoneSet = new Set<number>(MILESTONE_YEARS);
  const out: TenureMilestone[] = [];

  for (const e of employees) {
    const joined = new Date(e.createdAt);
    const joinedY = joined.getFullYear();
    const joinedM = joined.getMonth();
    const joinedD = joined.getDate();

    let upcoming = new Date(todayY, joinedM, joinedD);
    let upcomingYear = todayY;
    if (upcoming.getTime() < todayMid.getTime()) {
      upcoming = new Date(todayY + 1, joinedM, joinedD);
      upcomingYear = todayY + 1;
    }

    const yearsAt = upcomingYear - joinedY;
    if (yearsAt <= 0) continue;
    if (!milestoneSet.has(yearsAt)) continue;

    const daysUntil = Math.round(
      (upcoming.getTime() - todayMid.getTime()) / MS_PER_DAY,
    );
    if (daysUntil < 0 || daysUntil > daysAhead) continue;

    out.push({
      id: e.id,
      name: e.name,
      role: e.role,
      avatarUrl: e.avatarUrl,
      yearsAt,
      anniversaryDate: upcoming,
      daysUntil,
    });
  }

  out.sort((a, b) => a.daysUntil - b.daysUntil);
  return out;
}
