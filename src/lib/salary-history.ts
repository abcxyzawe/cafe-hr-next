import "server-only";
import { prisma } from "./prisma";

export type SalaryChange = {
  id: number;
  oldRate: number;
  newRate: number;
  changedBy: string | null;
  changedAt: Date;
  deltaPct: number;
};

export async function getSalaryHistory(employeeId: number): Promise<SalaryChange[]> {
  const logs = await prisma.activityLog.findMany({
    where: {
      entityType: "employee",
      entityId: employeeId,
      action: "employee.update",
    },
    orderBy: { id: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  const changes: SalaryChange[] = [];
  for (const log of logs) {
    const meta =
      log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? (log.metadata as Record<string, unknown>)
        : null;
    if (!meta) continue;
    const oldRate = meta.oldRate;
    const newRate = meta.newRate;
    if (typeof oldRate !== "number" || typeof newRate !== "number") continue;
    if (oldRate === newRate) continue;
    if (!Number.isFinite(oldRate) || !Number.isFinite(newRate) || oldRate <= 0) continue;

    const deltaPct = Math.round(((newRate - oldRate) / oldRate) * 1000) / 10;
    changes.push({
      id: log.id,
      oldRate,
      newRate,
      changedBy: log.user?.name ?? null,
      changedAt: log.createdAt,
      deltaPct,
    });
  }
  return changes;
}
