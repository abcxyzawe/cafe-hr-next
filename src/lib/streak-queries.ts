import "server-only";
import { prisma } from "./prisma";
import { computeStreak, type StreakInfo } from "./streak";

export type StreakLeader = {
  employeeId: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  current: number;
  longest: number;
};

/**
 * Compute streak info for a single employee.
 */
export async function getStreakForEmployee(
  employeeId: number,
): Promise<StreakInfo> {
  const rows = await prisma.attendance.findMany({
    where: { employeeId },
    select: { checkIn: true },
    orderBy: { checkIn: "asc" },
  });
  return computeStreak(rows.map((r) => r.checkIn));
}

/**
 * Top N employees by current streak length (must be > 0).
 * Tie-break by longest streak desc, then by name asc.
 */
export async function getTopStreaks(limit: number): Promise<StreakLeader[]> {
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, role: true, avatarUrl: true },
  });
  if (employees.length === 0) return [];

  const ids = employees.map((e) => e.id);
  const attendance = await prisma.attendance.findMany({
    where: { employeeId: { in: ids } },
    select: { employeeId: true, checkIn: true },
  });

  const grouped = new Map<number, Date[]>();
  for (const id of ids) grouped.set(id, []);
  for (const a of attendance) {
    const arr = grouped.get(a.employeeId);
    if (arr) arr.push(a.checkIn);
  }

  const leaders: StreakLeader[] = [];
  for (const emp of employees) {
    const dates = grouped.get(emp.id) ?? [];
    const info = computeStreak(dates);
    if (info.currentStreak <= 0) continue;
    leaders.push({
      employeeId: emp.id,
      name: emp.name,
      role: emp.role as string,
      avatarUrl: emp.avatarUrl,
      current: info.currentStreak,
      longest: info.longestStreak,
    });
  }

  leaders.sort((a, b) => {
    if (b.current !== a.current) return b.current - a.current;
    if (b.longest !== a.longest) return b.longest - a.longest;
    return a.name.localeCompare(b.name);
  });

  return leaders.slice(0, limit);
}
