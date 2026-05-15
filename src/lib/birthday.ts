import { prisma } from "./prisma";

export type UpcomingBirthday = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  dateOfBirth: Date;
  daysUntil: number;
  turningAge: number;
  upcomingDate: Date;
};

/**
 * Find employees with birthdays in the next N days (default 30).
 * Handles year wrap-around (Dec 28 → Jan 3).
 */
export async function upcomingBirthdays(
  daysAhead = 30,
): Promise<UpcomingBirthday[]> {
  const employees = await prisma.employee.findMany({
    where: { dateOfBirth: { not: null } },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      dateOfBirth: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + daysAhead);

  const result: UpcomingBirthday[] = [];
  for (const e of employees) {
    if (!e.dateOfBirth) continue;
    const dob = new Date(e.dateOfBirth);

    // This year's birthday
    let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    next.setHours(0, 0, 0, 0);
    if (next < today) {
      next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
    }

    if (next > horizon) continue;

    const daysUntil = Math.round(
      (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const turningAge = next.getFullYear() - dob.getFullYear();

    result.push({
      id: e.id,
      name: e.name,
      role: e.role,
      avatarUrl: e.avatarUrl,
      dateOfBirth: dob,
      daysUntil,
      turningAge,
      upcomingDate: next,
    });
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}
