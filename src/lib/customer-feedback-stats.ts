import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FeedbackStats = {
  total: number;
  avgRating: number;
  /** Counts ordered as [c5, c4, c3, c2, c1] */
  distribution: number[];
};

function parseRating(raw: Prisma.JsonValue | null): number | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as { [k: string]: Prisma.JsonValue | undefined };
  const r = obj.rating;
  if (typeof r !== "number") return null;
  if (!Number.isFinite(r)) return null;
  const rounded = Math.round(r);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export async function getCustomerFeedbackStats(
  daysAhead = 30,
): Promise<FeedbackStats> {
  const start = new Date();
  start.setDate(start.getDate() - daysAhead);

  const rows = await prisma.activityLog.findMany({
    where: {
      action: "customer.feedback",
      createdAt: { gte: start },
    },
    select: { metadata: true },
  });

  // distribution[0] = 5★, [1] = 4★, ..., [4] = 1★
  const distribution = [0, 0, 0, 0, 0];
  let total = 0;
  let sum = 0;

  for (const r of rows) {
    const rating = parseRating(r.metadata);
    if (rating === null) continue;
    distribution[5 - rating] += 1;
    sum += rating;
    total += 1;
  }

  const avgRating = total > 0 ? sum / total : 0;
  return { total, avgRating, distribution };
}
