import "server-only";
import { prisma } from "./prisma";
import {
  computeUpcomingMilestones,
  type TenureMilestone,
} from "./tenure";

/**
 * Returns employees hitting a 1/2/3/5/10-year work anniversary within
 * the next `daysAhead` days, sorted by daysUntil asc.
 */
export async function getUpcomingTenureMilestones(
  daysAhead: number = 30,
): Promise<TenureMilestone[]> {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  return computeUpcomingMilestones(
    employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role as string,
      avatarUrl: e.avatarUrl,
      createdAt: e.createdAt,
    })),
    daysAhead,
  );
}
