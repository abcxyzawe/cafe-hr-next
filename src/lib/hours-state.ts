export const STORAGE_KEY = "cafe-hr-hours";
export const HOURS_EVENT = "cafe-hr:hours-changed";

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

export type WeekHours = Record<WeekDay, DayHours>;

export const WEEKDAYS: WeekDay[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const WEEKDAY_LABEL: Record<WeekDay, string> = {
  mon: "Thứ Hai",
  tue: "Thứ Ba",
  wed: "Thứ Tư",
  thu: "Thứ Năm",
  fri: "Thứ Sáu",
  sat: "Thứ Bảy",
  sun: "Chủ Nhật",
};

const DEFAULT_DAY: DayHours = { open: "07:00", close: "22:00", closed: false };

export const DEFAULT_HOURS: WeekHours = {
  mon: { ...DEFAULT_DAY },
  tue: { ...DEFAULT_DAY },
  wed: { ...DEFAULT_DAY },
  thu: { ...DEFAULT_DAY },
  fri: { ...DEFAULT_DAY },
  sat: { ...DEFAULT_DAY },
  sun: { ...DEFAULT_DAY },
};

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isWeekDay(value: string): value is WeekDay {
  return (WEEKDAYS as string[]).includes(value);
}

function sanitizeDay(input: unknown): DayHours {
  if (!input || typeof input !== "object") return { ...DEFAULT_DAY };
  const entry = input as Record<string, unknown>;
  const open =
    typeof entry.open === "string" && HHMM_RE.test(entry.open)
      ? entry.open
      : DEFAULT_DAY.open;
  const close =
    typeof entry.close === "string" && HHMM_RE.test(entry.close)
      ? entry.close
      : DEFAULT_DAY.close;
  const closed = typeof entry.closed === "boolean" ? entry.closed : false;
  return { open, close, closed };
}

function parseState(raw: string | null): WeekHours {
  const out: WeekHours = {
    mon: { ...DEFAULT_DAY },
    tue: { ...DEFAULT_DAY },
    wed: { ...DEFAULT_DAY },
    thu: { ...DEFAULT_DAY },
    fri: { ...DEFAULT_DAY },
    sat: { ...DEFAULT_DAY },
    sun: { ...DEFAULT_DAY },
  };
  if (!raw) return out;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return out;
    }
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!isWeekDay(key)) continue;
      out[key] = sanitizeDay(value);
    }
    return out;
  } catch {
    return out;
  }
}

export function getWeekHours(): WeekHours {
  const storage = safeStorage();
  if (!storage) {
    return {
      mon: { ...DEFAULT_DAY },
      tue: { ...DEFAULT_DAY },
      wed: { ...DEFAULT_DAY },
      thu: { ...DEFAULT_DAY },
      fri: { ...DEFAULT_DAY },
      sat: { ...DEFAULT_DAY },
      sun: { ...DEFAULT_DAY },
    };
  }
  try {
    return parseState(storage.getItem(STORAGE_KEY));
  } catch {
    return {
      mon: { ...DEFAULT_DAY },
      tue: { ...DEFAULT_DAY },
      wed: { ...DEFAULT_DAY },
      thu: { ...DEFAULT_DAY },
      fri: { ...DEFAULT_DAY },
      sat: { ...DEFAULT_DAY },
      sun: { ...DEFAULT_DAY },
    };
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
      new CustomEvent(HOURS_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeState(next: WeekHours): void {
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

export function setDayHours(day: WeekDay, hours: DayHours): void {
  const current = getWeekHours();
  current[day] = sanitizeDay(hours);
  writeState(current);
}

export function setAllDays(hours: DayHours): void {
  const sanitized = sanitizeDay(hours);
  const next: WeekHours = {
    mon: { ...sanitized },
    tue: { ...sanitized },
    wed: { ...sanitized },
    thu: { ...sanitized },
    fri: { ...sanitized },
    sat: { ...sanitized },
    sun: { ...sanitized },
  };
  writeState(next);
}

export function resetToDefaults(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  dispatchChange(null);
}
