export const STORAGE_KEY = "cafe-hr-demographics";
export const DEMOGRAPHICS_EVENT = "cafe-hr:demographics-changed";

export type AgeBucket = "under20" | "20to30" | "31to50" | "over50" | "unsure";
export type PurposeBucket =
  | "study"
  | "work"
  | "social"
  | "dating"
  | "takeaway"
  | "other";

export type DayCounts = {
  date: string; // YYYY-MM-DD
  age: Record<AgeBucket, number>;
  purpose: Record<PurposeBucket, number>;
};

export const AGE_BUCKETS: AgeBucket[] = [
  "under20",
  "20to30",
  "31to50",
  "over50",
  "unsure",
];

export const PURPOSE_BUCKETS: PurposeBucket[] = [
  "study",
  "work",
  "social",
  "dating",
  "takeaway",
  "other",
];

export const AGE_LABEL: Record<AgeBucket, string> = {
  under20: "Dưới 20",
  "20to30": "20–30",
  "31to50": "31–50",
  over50: "Trên 50",
  unsure: "Không rõ",
};

export const PURPOSE_LABEL: Record<PurposeBucket, string> = {
  study: "Học tập",
  work: "Làm việc",
  social: "Gặp bạn",
  dating: "Hẹn hò",
  takeaway: "Mang đi",
  other: "Khác",
};

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyAge(): Record<AgeBucket, number> {
  return { under20: 0, "20to30": 0, "31to50": 0, over50: 0, unsure: 0 };
}

function emptyPurpose(): Record<PurposeBucket, number> {
  return {
    study: 0,
    work: 0,
    social: 0,
    dating: 0,
    takeaway: 0,
    other: 0,
  };
}

function emptyDay(date: string): DayCounts {
  return { date, age: emptyAge(), purpose: emptyPurpose() };
}

function isAgeBucket(v: unknown): v is AgeBucket {
  return (
    typeof v === "string" &&
    (AGE_BUCKETS as string[]).includes(v)
  );
}

function isPurposeBucket(v: unknown): v is PurposeBucket {
  return (
    typeof v === "string" &&
    (PURPOSE_BUCKETS as string[]).includes(v)
  );
}

function coerceNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    return Math.floor(v);
  }
  return 0;
}

function isDayCounts(v: unknown): v is DayCounts {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.date !== "string") return false;
  if (!o.age || typeof o.age !== "object") return false;
  if (!o.purpose || typeof o.purpose !== "object") return false;
  return true;
}

function normalizeDay(raw: unknown): DayCounts | null {
  if (!isDayCounts(raw)) return null;
  const day = emptyDay(raw.date);
  const ageObj = raw.age as Record<string, unknown>;
  for (const key of AGE_BUCKETS) {
    day.age[key] = coerceNumber(ageObj[key]);
  }
  const purposeObj = raw.purpose as Record<string, unknown>;
  for (const key of PURPOSE_BUCKETS) {
    day.purpose[key] = coerceNumber(purposeObj[key]);
  }
  return day;
}

export function getAllCounts(): DayCounts[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: DayCounts[] = [];
    for (const v of parsed) {
      const d = normalizeDay(v);
      if (d) out.push(d);
    }
    return out;
  } catch {
    return [];
  }
}

function writeAll(days: DayCounts[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(days));
  } catch {
    return;
  }
  dispatchChange();
}

function dispatchChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(DEMOGRAPHICS_EVENT));
  } catch {
    // ignore
  }
}

function todayKey(): string {
  return ymd(new Date());
}

export function getTodayCounts(): DayCounts {
  const all = getAllCounts();
  const key = todayKey();
  const found = all.find((d) => d.date === key);
  if (found) return found;
  return emptyDay(key);
}

function upsertToday(all: DayCounts[]): {
  list: DayCounts[];
  today: DayCounts;
} {
  const key = todayKey();
  const idx = all.findIndex((d) => d.date === key);
  if (idx >= 0) {
    return { list: all, today: all[idx] };
  }
  const day = emptyDay(key);
  all.push(day);
  return { list: all, today: day };
}

export function increment(
  category: "age" | "purpose",
  bucket: string,
): void {
  const all = getAllCounts();
  const { list, today } = upsertToday(all);
  if (category === "age" && isAgeBucket(bucket)) {
    today.age[bucket] = (today.age[bucket] ?? 0) + 1;
  } else if (category === "purpose" && isPurposeBucket(bucket)) {
    today.purpose[bucket] = (today.purpose[bucket] ?? 0) + 1;
  } else {
    return;
  }
  writeAll(list);
}

export function decrement(
  category: "age" | "purpose",
  bucket: string,
): void {
  const all = getAllCounts();
  const { list, today } = upsertToday(all);
  if (category === "age" && isAgeBucket(bucket)) {
    today.age[bucket] = Math.max(0, (today.age[bucket] ?? 0) - 1);
  } else if (category === "purpose" && isPurposeBucket(bucket)) {
    today.purpose[bucket] = Math.max(0, (today.purpose[bucket] ?? 0) - 1);
  } else {
    return;
  }
  writeAll(list);
}

export function resetToday(): void {
  const all = getAllCounts();
  const key = todayKey();
  const next = all.filter((d) => d.date !== key);
  writeAll(next);
}

export function totalForDay(day: DayCounts): number {
  let total = 0;
  for (const k of AGE_BUCKETS) total += day.age[k];
  return total;
}

export function dominantAge(day: DayCounts): AgeBucket | null {
  let best: AgeBucket | null = null;
  let bestCount = 0;
  for (const k of AGE_BUCKETS) {
    const c = day.age[k];
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export function dominantPurpose(day: DayCounts): PurposeBucket | null {
  let best: PurposeBucket | null = null;
  let bestCount = 0;
  for (const k of PURPOSE_BUCKETS) {
    const c = day.purpose[k];
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export function exportLast30DaysCsv(): string {
  const all = getAllCounts();
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 29);
  cutoff.setHours(0, 0, 0, 0);

  const recent = all
    .filter((d) => {
      const [y, m, day] = d.date.split("-").map((s) => Number.parseInt(s, 10));
      if (!y || !m || !day) return false;
      const dt = new Date(y, m - 1, day);
      return dt >= cutoff;
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const header = [
    "date",
    ...AGE_BUCKETS.map((k) => `age_${k}`),
    ...PURPOSE_BUCKETS.map((k) => `purpose_${k}`),
    "total",
  ];
  const lines: string[] = [header.join(",")];
  for (const d of recent) {
    const total = totalForDay(d);
    const row = [
      d.date,
      ...AGE_BUCKETS.map((k) => String(d.age[k])),
      ...PURPOSE_BUCKETS.map((k) => String(d.purpose[k])),
      String(total),
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}
