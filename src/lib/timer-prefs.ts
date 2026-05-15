export const STORAGE_KEY = "cafe-hr-timer-prefs";
export const STATS_KEY = "cafe-hr-timer-stats";
export const TIMER_EVENT = "cafe-hr:timer-changed";

export type TimerPrefs = {
  workMinutes: number;
  breakMinutes: number;
  cyclesGoal: number;
};

export const DEFAULT_TIMER_PREFS: TimerPrefs = {
  workMinutes: 25,
  breakMinutes: 5,
  cyclesGoal: 4,
};

const MIN_MINUTES = 1;
const MAX_MINUTES = 120;
const MIN_CYCLES = 1;
const MAX_CYCLES = 24;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const v = Math.floor(value);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

export function normalizeTimerPrefs(input: unknown): TimerPrefs {
  if (input === null || typeof input !== "object") return DEFAULT_TIMER_PREFS;
  const obj = input as Record<string, unknown>;
  const work =
    typeof obj.workMinutes === "number" ? obj.workMinutes : DEFAULT_TIMER_PREFS.workMinutes;
  const brk =
    typeof obj.breakMinutes === "number" ? obj.breakMinutes : DEFAULT_TIMER_PREFS.breakMinutes;
  const goal =
    typeof obj.cyclesGoal === "number" ? obj.cyclesGoal : DEFAULT_TIMER_PREFS.cyclesGoal;
  return {
    workMinutes: clamp(work, MIN_MINUTES, MAX_MINUTES),
    breakMinutes: clamp(brk, MIN_MINUTES, MAX_MINUTES),
    cyclesGoal: clamp(goal, MIN_CYCLES, MAX_CYCLES),
  };
}

export function getTimerPrefs(): TimerPrefs {
  if (typeof window === "undefined") return DEFAULT_TIMER_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TIMER_PREFS;
    const parsed: unknown = JSON.parse(raw);
    return normalizeTimerPrefs(parsed);
  } catch {
    return DEFAULT_TIMER_PREFS;
  }
}

export function setTimerPrefs(prefs: TimerPrefs): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeTimerPrefs(prefs);
  const json = JSON.stringify(normalized);
  window.localStorage.setItem(STORAGE_KEY, json);
  window.dispatchEvent(new Event(TIMER_EVENT));
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: json,
    }),
  );
}

export function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type StatsShape = { date: string; completed: number };

function readStats(): StatsShape {
  const today = todayKey();
  if (typeof window === "undefined") return { date: today, completed: 0 };
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return { date: today, completed: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return { date: today, completed: 0 };
    }
    const obj = parsed as Record<string, unknown>;
    const date = typeof obj.date === "string" ? obj.date : today;
    const completed =
      typeof obj.completed === "number" && Number.isFinite(obj.completed)
        ? Math.max(0, Math.floor(obj.completed))
        : 0;
    if (date !== today) return { date: today, completed: 0 };
    return { date, completed };
  } catch {
    return { date: today, completed: 0 };
  }
}

function writeStats(stats: StatsShape): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(stats);
  window.localStorage.setItem(STATS_KEY, json);
  window.dispatchEvent(new Event(TIMER_EVENT));
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STATS_KEY,
      newValue: json,
    }),
  );
}

export function getCompletedToday(): number {
  return readStats().completed;
}

export function incrementCompleted(): void {
  if (typeof window === "undefined") return;
  const current = readStats();
  writeStats({ date: current.date, completed: current.completed + 1 });
}

export function resetCompletedToday(): void {
  if (typeof window === "undefined") return;
  writeStats({ date: todayKey(), completed: 0 });
}
