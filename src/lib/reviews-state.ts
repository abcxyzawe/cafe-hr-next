export const STORAGE_KEY = "cafe-hr-reviews";
export const REVIEWS_EVENT = "cafe-hr:reviews-changed";

export type ReviewSource = "in-store" | "google" | "fb";

export type Review = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  customerName: string;
  source: ReviewSource;
  createdAt: string; // ISO
};

export const SOURCE_LABEL: Record<ReviewSource, string> = {
  "in-store": "Tại quán",
  google: "Google",
  fb: "Facebook",
};

const VALID_SOURCES: ReadonlyArray<ReviewSource> = ["in-store", "google", "fb"];
const VALID_RATINGS: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

const COMMENT_MAX = 50;

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isSource(v: unknown): v is ReviewSource {
  return typeof v === "string" && (VALID_SOURCES as ReadonlyArray<string>).includes(v);
}

function isRating(v: unknown): v is 1 | 2 | 3 | 4 | 5 {
  return (
    typeof v === "number" &&
    (VALID_RATINGS as ReadonlyArray<number>).includes(v)
  );
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseList(raw: string | null): Review[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Review[] = [];
    for (const v of parsed) {
      if (!v || typeof v !== "object") continue;
      const r = v as Record<string, unknown>;
      const id = r.id;
      const rating = r.rating;
      const comment = r.comment;
      const customerName = r.customerName;
      const source = r.source;
      const createdAt = r.createdAt;
      if (
        isString(id) &&
        isRating(rating) &&
        isString(comment) &&
        isString(customerName) &&
        isSource(source) &&
        isString(createdAt)
      ) {
        out.push({
          id,
          rating,
          comment: comment.slice(0, COMMENT_MAX),
          customerName,
          source,
          createdAt,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function getReviews(): Review[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return parseList(storage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function dispatchChange(newValue: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(REVIEWS_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeList(next: Review[]): void {
  const storage = safeStorage();
  if (!storage) return;
  const value = JSON.stringify(next);
  try {
    storage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
  dispatchChange(value);
}

function newId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addReview(input: {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  customerName?: string;
  source?: ReviewSource;
}): Review {
  const review: Review = {
    id: newId(),
    rating: input.rating,
    comment: (input.comment ?? "").trim().slice(0, COMMENT_MAX),
    customerName: (input.customerName ?? "").trim(),
    source: input.source ?? "in-store",
    createdAt: new Date().toISOString(),
  };
  const list = getReviews();
  list.push(review);
  writeList(list);
  return review;
}

export function removeReview(id: string): void {
  const list = getReviews();
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return;
  writeList(next);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getTodayReviews(): Review[] {
  const all = getReviews();
  const today = new Date();
  return all.filter((r) => {
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) return false;
    return isSameLocalDay(d, today);
  });
}

export function getDailyAverages(
  days: number,
): Array<{ date: string; avg: number; count: number }> {
  const safeDays = Math.max(1, Math.floor(days));
  const all = getReviews();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { sum: number; count: number }>();
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(localDateKey(d), { sum: 0, count: 0 });
  }

  for (const r of all) {
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = localDateKey(d);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.sum += r.rating;
    bucket.count += 1;
  }

  const out: Array<{ date: string; avg: number; count: number }> = [];
  for (const [date, { sum, count }] of buckets) {
    out.push({
      date,
      avg: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
      count,
    });
  }
  return out;
}
