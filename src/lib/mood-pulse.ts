// Daily Mood Pulse — privacy-respecting client-only logic.
// Stores mood entries in localStorage on the user's device (no backend).
// SSR-safe: every reader returns an empty value when `window` is undefined.

export type MoodValue = 1 | 2 | 3 | 4 | 5; // 1 = very sad … 5 = very happy
export type MoodEntry = { date: string; mood: MoodValue }; // date is YYYY-MM-DD local

export const MOOD_STORAGE_KEY = "cafe-hr-mood-pulse";
export const MOOD_CHANGE_EVENT = "cafe-hr:mood-changed";

export const MOOD_VALUES: ReadonlyArray<MoodValue> = [1, 2, 3, 4, 5];

export const MOOD_EMOJI: Record<MoodValue, string> = {
  1: "😢",
  2: "😟",
  3: "😐",
  4: "😊",
  5: "😀",
};

export const MOOD_LABEL: Record<MoodValue, string> = {
  1: "Rất buồn",
  2: "Buồn",
  3: "Bình thường",
  4: "Vui",
  5: "Rất vui",
};

// Five distinct, accessible tints for the selected-state pill / strip cell.
export const MOOD_TINT: Record<MoodValue, string> = {
  1: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  2: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  3: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  4: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
  5: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

// Local YYYY-MM-DD (avoids UTC drift around midnight).
export function todayLocalIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isMoodValue(v: unknown): v is MoodValue {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}

function isMoodEntry(v: unknown): v is MoodEntry {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.date === "string" && isMoodValue(obj.mood);
}

function safeParseHistory(raw: string | null): MoodEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries: MoodEntry[] = [];
    for (const item of parsed) {
      if (isMoodEntry(item)) entries.push(item);
    }
    // Sort ascending by date for predictable UIs.
    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries;
  } catch {
    return [];
  }
}

export function getMoodHistory(): MoodEntry[] {
  if (typeof window === "undefined") return [];
  return safeParseHistory(window.localStorage.getItem(MOOD_STORAGE_KEY));
}

export function getTodayMood(): MoodEntry | null {
  if (typeof window === "undefined") return null;
  const today = todayLocalIso();
  const history = getMoodHistory();
  return history.find((e) => e.date === today) ?? null;
}

export function setTodayMood(mood: MoodValue): void {
  if (typeof window === "undefined") return;
  const today = todayLocalIso();
  const history = getMoodHistory();
  const idx = history.findIndex((e) => e.date === today);
  if (idx >= 0) {
    history[idx] = { date: today, mood };
  } else {
    history.push({ date: today, mood });
  }
  // Cap to a reasonable horizon to avoid unbounded growth (~1 year).
  const trimmed = history.slice(-400);
  const serialized = JSON.stringify(trimmed);
  window.localStorage.setItem(MOOD_STORAGE_KEY, serialized);

  // Cross-tab notification: real `storage` events only fire in OTHER tabs,
  // so dispatch a custom event here for same-tab listeners.
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: MOOD_STORAGE_KEY,
        newValue: serialized,
      }),
    );
  } catch {
    // Some browsers restrict synthetic StorageEvent construction; ignore.
  }
  window.dispatchEvent(new CustomEvent(MOOD_CHANGE_EVENT));
}

// Returns only entries that exist within the last `n` days (inclusive of today).
// UI is responsible for rendering gaps for missing days.
export function getLastNDaysMoods(n: number): MoodEntry[] {
  if (n <= 0) return [];
  if (typeof window === "undefined") return [];
  const history = getMoodHistory();
  const today = new Date();
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - (n - 1));
  const earliestIso = todayLocalIso(earliest);
  return history.filter((e) => e.date >= earliestIso);
}
