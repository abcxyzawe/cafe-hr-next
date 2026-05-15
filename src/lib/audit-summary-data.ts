import "server-only";

import { prisma } from "@/lib/prisma";

export type AuditSummaryFacts = {
  dayCount: number;
  totalEvents: number;
  byAction: Record<string, number>;
  topUsers: Array<{ name: string; count: number }>;
  samples: string[];
};

export type CachedAuditSummary = {
  generatedAt: Date;
  content: string;
};

const MAX_LOGS = 200;
const MAX_SAMPLES = 8;
const TOP_USERS = 5;
const MAX_CACHE_ENTRIES = 8;

const cache = new Map<string, CachedAuditSummary>();

export async function gatherAuditFacts(
  daysBack: number = 7,
): Promise<AuditSummaryFacts> {
  const days = Number.isFinite(daysBack) && daysBack > 0 ? Math.floor(daysBack) : 7;
  const since = new Date(Date.now() - days * 86_400_000);

  const logs = await prisma.activityLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: MAX_LOGS,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const byAction: Record<string, number> = {};
  const userCounts = new Map<string, number>();

  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] ?? 0) + 1;
    const userKey = log.user
      ? log.user.name.trim() || log.user.email.trim() || `#${log.user.id}`
      : "Hệ thống";
    userCounts.set(userKey, (userCounts.get(userKey) ?? 0) + 1);
  }

  const topUsers = Array.from(userCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_USERS);

  const samples: string[] = [];
  const seen = new Set<string>();
  for (const log of logs) {
    const s = log.summary.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    samples.push(s);
    if (samples.length >= MAX_SAMPLES) break;
  }

  return {
    dayCount: days,
    totalEvents: logs.length,
    byAction,
    topUsers,
    samples,
  };
}

export function getCachedSummary(dayKey: string): CachedAuditSummary | null {
  return cache.get(dayKey) ?? null;
}

export function setCachedSummary(
  dayKey: string,
  value: CachedAuditSummary,
): void {
  if (cache.has(dayKey)) {
    cache.delete(dayKey);
  } else if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(dayKey, value);
}

export function currentDayKey(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
