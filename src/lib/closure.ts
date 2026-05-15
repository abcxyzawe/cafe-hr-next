import "server-only";
import { prisma } from "./prisma";

export type TodayClosure = {
  id: number;
  reason: string;
  declaredBy: string;
  declaredAt: Date;
};

export type ScheduledClosure = {
  id: number;
  reason: string;
  declaredBy: string;
  declaredAt: Date;
  /** ISO date YYYY-MM-DD of the closure */
  closureDate: string;
};

function todayIsoLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Read all live (non-cancelled) closure declarations from the recent window.
 * We pull the last 200 closure logs and parse metadata in JS — keeps the
 * query simple and avoids JSON-path quirks across Postgres versions.
 */
async function fetchRecentClosures(): Promise<
  Array<{
    id: number;
    declaredBy: string;
    declaredAt: Date;
    reason: string;
    closureDate: string;
    cancelled: boolean;
  }>
> {
  const start = new Date();
  start.setDate(start.getDate() - 30); // look back 30 days max for context
  start.setHours(0, 0, 0, 0);

  const logs = await prisma.activityLog.findMany({
    where: {
      action: "closure.declare",
      createdAt: { gte: start },
    },
    orderBy: { id: "desc" },
    take: 200,
    include: { user: { select: { name: true } } },
  });

  return logs.map((log) => {
    const meta =
      log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? (log.metadata as Record<string, unknown>)
        : null;
    const cancelled = meta?.cancelled === true;
    const reason =
      meta && typeof meta.reason === "string" && meta.reason.trim().length > 0
        ? meta.reason
        : log.summary;
    // Backward compat: older closures had no closureDate → fall back to log creation date in local TZ
    const fallback = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, "0")}-${String(log.createdAt.getDate()).padStart(2, "0")}`;
    const closureDate =
      meta && typeof meta.closureDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.closureDate)
        ? meta.closureDate
        : fallback;
    return {
      id: log.id,
      declaredBy: log.user?.name ?? "Quản lý",
      declaredAt: log.createdAt,
      reason,
      closureDate,
      cancelled,
    };
  });
}

/** Latest active closure scheduled for TODAY, or null. */
export async function getTodayClosure(): Promise<TodayClosure | null> {
  const today = todayIsoLocal();
  const closures = await fetchRecentClosures();
  // Group by closureDate, take latest per date; the most recent overrides cancellations
  const todays = closures.filter((c) => c.closureDate === today);
  if (todays.length === 0) return null;
  const latest = todays[0]; // already sorted desc by id
  if (latest.cancelled) return null;
  return {
    id: latest.id,
    reason: latest.reason,
    declaredBy: latest.declaredBy,
    declaredAt: latest.declaredAt,
  };
}

/** Active closures scheduled for future dates within `daysAhead`, sorted by closureDate asc. */
export async function getUpcomingClosures(daysAhead = 30): Promise<ScheduledClosure[]> {
  const today = todayIsoLocal();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + daysAhead);
  horizon.setHours(23, 59, 59, 999);
  const horizonIso = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, "0")}-${String(horizon.getDate()).padStart(2, "0")}`;

  const closures = await fetchRecentClosures();
  // Take latest log per closureDate (already sorted desc by id, so first per date wins)
  const seenDates = new Set<string>();
  const latestPerDate: typeof closures = [];
  for (const c of closures) {
    if (seenDates.has(c.closureDate)) continue;
    seenDates.add(c.closureDate);
    latestPerDate.push(c);
  }
  return latestPerDate
    .filter(
      (c) =>
        !c.cancelled && c.closureDate > today && c.closureDate <= horizonIso,
    )
    .sort((a, b) => a.closureDate.localeCompare(b.closureDate))
    .map((c) => ({
      id: c.id,
      reason: c.reason,
      declaredBy: c.declaredBy,
      declaredAt: c.declaredAt,
      closureDate: c.closureDate,
    }));
}
