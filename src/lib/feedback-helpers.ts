import type { Prisma } from "@prisma/client";

export type Sentiment = "negative" | "neutral" | "positive";

export type SentimentMeta = {
  key: Sentiment;
  label: string;
  chipClass: string;
};

export const SENTIMENT_META: Record<Sentiment, SentimentMeta> = {
  negative: {
    key: "negative",
    label: "Tiêu cực",
    chipClass:
      "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  },
  neutral: {
    key: "neutral",
    label: "Trung tính",
    chipClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  },
  positive: {
    key: "positive",
    label: "Tích cực",
    chipClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
};

export function sentimentFromRating(rating: number | null): Sentiment | null {
  if (rating === null) return null;
  if (rating <= 2) return "negative";
  if (rating === 3) return "neutral";
  return "positive";
}

export type CustomerFeedbackMeta = {
  rating: number | null;
  comment: string | null;
  name: string | null;
  contact: string | null;
};

export function readCustomerMetadata(
  raw: Prisma.JsonValue | null,
): CustomerFeedbackMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { rating: null, comment: null, name: null, contact: null };
  }
  const obj = raw as { [k: string]: Prisma.JsonValue | undefined };
  const rawRating = obj.rating;
  const rawComment = obj.comment;
  const rawName = obj.name;
  const rawContact = obj.contact;
  let rating: number | null = null;
  if (typeof rawRating === "number" && rawRating >= 1 && rawRating <= 5) {
    rating = Math.round(rawRating);
  }
  return {
    rating,
    comment: typeof rawComment === "string" ? rawComment : null,
    name: typeof rawName === "string" && rawName.length > 0 ? rawName : null,
    contact:
      typeof rawContact === "string" && rawContact.length > 0
        ? rawContact
        : null,
  };
}

export type RatingSummary = {
  total: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function summarizeRatings(ratings: ReadonlyArray<number>): RatingSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let sum = 0;
  let total = 0;
  for (const r of ratings) {
    if (r >= 1 && r <= 5) {
      const k = Math.round(r) as 1 | 2 | 3 | 4 | 5;
      distribution[k] += 1;
      sum += k;
      total += 1;
    }
  }
  const average = total === 0 ? 0 : sum / total;
  return { total, average, distribution };
}
