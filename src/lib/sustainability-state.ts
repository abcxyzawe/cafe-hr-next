export const STORAGE_KEY = "cafe-hr-sustainability";
export const SUSTAIN_EVENT = "cafe-hr:sustainability-changed";

export type SustainDay = {
  date: string; // YYYY-MM-DD
  compostKg: number;
  recyclingKg: number;
  reusableCupsOffered: number;
  reusableCupsAccepted: number;
  waterSavedLiters: number;
};

export type SustainNumericField = keyof Omit<SustainDay, "date">;

const FIELDS: ReadonlyArray<SustainNumericField> = [
  "compostKg",
  "recyclingKg",
  "reusableCupsOffered",
  "reusableCupsAccepted",
  "waterSavedLiters",
];

const FIELD_BOUNDS: Record<SustainNumericField, { min: number; max: number }> = {
  compostKg: { min: 0, max: 50 },
  recyclingKg: { min: 0, max: 50 },
  reusableCupsOffered: { min: 0, max: 500 },
  reusableCupsAccepted: { min: 0, max: 500 },
  waterSavedLiters: { min: 0, max: 500 },
};

export function emptyDay(date: string): SustainDay {
  return {
    date,
    compostKg: 0,
    recyclingKg: 0,
    reusableCupsOffered: 0,
    reusableCupsAccepted: 0,
    waterSavedLiters: 0,
  };
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidDateStr(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function clampField(field: SustainNumericField, value: number): number {
  const { min, max } = FIELD_BOUNDS[field];
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.round(value * 100) / 100;
}

function parseDay(raw: unknown): SustainDay | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const date = obj.date;
  if (!isValidDateStr(date)) return null;
  const out = emptyDay(date);
  for (const f of FIELDS) {
    const v = obj[f];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[f] = clampField(f, v);
    }
  }
  return out;
}

export function getAllDays(): SustainDay[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SustainDay[] = [];
    for (const item of parsed) {
      const d = parseDay(item);
      if (d) out.push(d);
    }
    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
  } catch {
    return [];
  }
}

function writeAllDays(days: SustainDay[]): void {
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
    window.dispatchEvent(new CustomEvent(SUSTAIN_EVENT));
  } catch {
    // ignore
  }
}

export function getDayFor(date: string): SustainDay {
  const all = getAllDays();
  const found = all.find((d) => d.date === date);
  if (found) return found;
  return emptyDay(date);
}

export function setDayField(
  date: string,
  field: SustainNumericField,
  value: number,
): void {
  if (!isValidDateStr(date)) return;
  const clamped = clampField(field, value);
  const all = getAllDays();
  const idx = all.findIndex((d) => d.date === date);
  if (idx >= 0) {
    const next = { ...all[idx], [field]: clamped };
    all[idx] = next;
  } else {
    const next = emptyDay(date);
    next[field] = clamped;
    all.push(next);
    all.sort((a, b) => a.date.localeCompare(b.date));
  }
  writeAllDays(all);
}

function shiftDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getLastNDays(n: number): SustainDay[] {
  const all = getAllDays();
  const map = new Map<string, SustainDay>();
  for (const d of all) map.set(d.date, d);
  const out: SustainDay[] = [];
  const today = todayKey();
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = shiftDate(today, -i);
    const existing = map.get(date);
    out.push(existing ?? emptyDay(date));
  }
  return out;
}
