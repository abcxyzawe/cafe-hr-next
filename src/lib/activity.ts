import "server-only";
import { prisma } from "./prisma";
import { getSession } from "./auth";

type LogOpts = {
  action: string;
  entityType?: string;
  entityId?: number | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(opts: LogOpts): Promise<void> {
  try {
    const sess = await getSession();
    await prisma.activityLog.create({
      data: {
        userId: sess?.uid ?? null,
        action: opts.action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        summary: opts.summary,
        metadata: opts.metadata as never,
      },
    });
  } catch {
    // Logging must never break the calling action
  }
}

export async function recentActivities(limit = 10) {
  return prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}
