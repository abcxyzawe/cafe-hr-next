import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readCustomerMetadata } from "@/lib/feedback-helpers";

export type FeedbackFacts = {
  windowStart: Date;
  windowEnd: Date;
  customerCount: number;
  userCount: number;
  avgRating: number | null;
  /** Up to 10 anonymized message snippets from the most-recent entries. */
  sampleMessages: string[];
  /** Counts of user-feedback `category` values (e.g. bug/feature/praise/other). */
  byCategory: Record<string, number>;
};

export type CompiledReport = {
  generatedAt: Date;
  facts: FeedbackFacts;
  themes: string[];
  positives: string[];
  concerns: string[];
};

const MAX_CACHE_ENTRIES = 8;
const cache = new Map<string, CompiledReport>();

export function getCachedReport(dayKey: string): CompiledReport | null {
  return cache.get(dayKey) ?? null;
}

export function setCachedReport(dayKey: string, value: CompiledReport): void {
  if (cache.has(dayKey)) {
    cache.delete(dayKey);
  } else if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(dayKey, value);
}

function readUserFeedbackMeta(
  raw: Prisma.JsonValue | null,
): { message: string | null; category: string | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { message: null, category: null };
  }
  const obj = raw as { [k: string]: Prisma.JsonValue | undefined };
  const rawMessage = obj.message;
  const rawCategory = obj.category;
  const message =
    typeof rawMessage === "string" && rawMessage.trim().length > 0
      ? rawMessage.trim()
      : null;
  const category =
    typeof rawCategory === "string" && rawCategory.trim().length > 0
      ? rawCategory.trim()
      : null;
  return { message, category };
}

function anonymize(message: string): string {
  // Strip emails / phone numbers / @-mentions; cap length.
  const noEmail = message.replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    "[email]",
  );
  const noPhone = noEmail.replace(/(?:\+?\d[\d\s.-]{7,}\d)/g, "[sđt]");
  const noHandle = noPhone.replace(/@[A-Za-z0-9_]+/g, "[user]");
  const collapsed = noHandle.replace(/\s+/g, " ").trim();
  return collapsed.length > 240 ? `${collapsed.slice(0, 237)}…` : collapsed;
}

export async function gatherFeedbackFacts(
  daysBack?: number,
): Promise<FeedbackFacts> {
  const days = typeof daysBack === "number" && daysBack > 0 ? daysBack : 7;
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowStart.getDate() - days);

  const rows = await prisma.activityLog.findMany({
    where: {
      action: { in: ["customer.feedback", "user.feedback"] },
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    select: { action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  let customerCount = 0;
  let userCount = 0;
  let ratingSum = 0;
  let ratingTotal = 0;
  const byCategory: Record<string, number> = {};
  const sampleMessages: string[] = [];

  for (const row of rows) {
    if (row.action === "customer.feedback") {
      customerCount += 1;
      const meta = readCustomerMetadata(row.metadata);
      if (meta.rating !== null) {
        ratingSum += meta.rating;
        ratingTotal += 1;
      }
      if (sampleMessages.length < 10 && meta.comment) {
        const msg = anonymize(meta.comment);
        if (msg.length > 0) {
          const tag = meta.rating !== null ? ` [★${meta.rating}]` : "";
          sampleMessages.push(`khách: ${msg}${tag}`);
        }
      }
    } else if (row.action === "user.feedback") {
      userCount += 1;
      const meta = readUserFeedbackMeta(row.metadata);
      if (meta.category) {
        byCategory[meta.category] = (byCategory[meta.category] ?? 0) + 1;
      }
      if (sampleMessages.length < 10 && meta.message) {
        const msg = anonymize(meta.message);
        if (msg.length > 0) {
          const tag = meta.category ? ` [${meta.category}]` : "";
          sampleMessages.push(`nhân viên: ${msg}${tag}`);
        }
      }
    }
  }

  const avgRating =
    ratingTotal > 0 ? Math.round((ratingSum / ratingTotal) * 100) / 100 : null;

  return {
    windowStart,
    windowEnd,
    customerCount,
    userCount,
    avgRating,
    sampleMessages,
    byCategory,
  };
}
