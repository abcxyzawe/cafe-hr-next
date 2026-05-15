/**
 * Quiet hours preference: a daily window during which realtime toasts are
 * silenced. Also supports a one-shot snooze (epoch ms) that auto-expires.
 *
 * All reads are SSR-safe and degrade to "not quiet" on the server.
 */

export type QuietHoursConfig = {
  enabled: boolean;
  /** Minutes from midnight (0..1439). Inclusive lower bound. */
  startMinutes: number;
  /** Minutes from midnight (0..1439). Exclusive upper bound. */
  endMinutes: number;
};

export const STORAGE_KEY = "cafe-hr-quiet-hours";
export const SNOOZE_KEY = "cafe-hr-toast-snooze-until";

const DEFAULT: QuietHoursConfig = {
  enabled: false,
  startMinutes: 22 * 60,
  endMinutes: 6 * 60,
};

function clampMinutes(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.floor(n);
  if (v < 0 || v > 1439) return null;
  return v;
}

export function loadQuietHours(): QuietHoursConfig {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT };
    const obj = parsed as Record<string, unknown>;
    const enabled = typeof obj.enabled === "boolean" ? obj.enabled : DEFAULT.enabled;
    const start = clampMinutes(obj.startMinutes) ?? DEFAULT.startMinutes;
    const end = clampMinutes(obj.endMinutes) ?? DEFAULT.endMinutes;
    return { enabled, startMinutes: start, endMinutes: end };
  } catch {
    return { ...DEFAULT };
  }
}

export function setQuietHours(c: QuietHoursConfig): void {
  if (typeof window === "undefined") return;
  const safe: QuietHoursConfig = {
    enabled: !!c.enabled,
    startMinutes: clampMinutes(c.startMinutes) ?? DEFAULT.startMinutes,
    endMinutes: clampMinutes(c.endMinutes) ?? DEFAULT.endMinutes,
  };
  const next = JSON.stringify(safe);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY, newValue: next }),
    );
  } catch {
    // ignore quota/serialization errors
  }
}

export function loadSnoozeUntil(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SNOOZE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (n <= Date.now()) return null;
    return n;
  } catch {
    return null;
  }
}

export function setSnoozeUntil(ms: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (ms === null || !Number.isFinite(ms) || ms <= Date.now()) {
      window.localStorage.removeItem(SNOOZE_KEY);
      window.dispatchEvent(
        new StorageEvent("storage", { key: SNOOZE_KEY, newValue: null }),
      );
      return;
    }
    const next = String(Math.floor(ms));
    window.localStorage.setItem(SNOOZE_KEY, next);
    window.dispatchEvent(
      new StorageEvent("storage", { key: SNOOZE_KEY, newValue: next }),
    );
  } catch {
    // ignore
  }
}

/**
 * True when toasts should be silenced right now.
 *  - Active snooze (snoozeUntil in the future), OR
 *  - Quiet hours enabled AND the current minute-of-day falls in [start, end).
 *    Wrap-around windows (end < start, e.g. 22:00 → 06:00) are supported.
 *  - When start === end the window is treated as empty (never quiet).
 */
export function isCurrentlyQuiet(now: Date = new Date()): boolean {
  if (typeof window === "undefined") return false;

  const snooze = loadSnoozeUntil();
  if (snooze !== null && now.getTime() < snooze) return true;

  const cfg = loadQuietHours();
  if (!cfg.enabled) return false;
  if (cfg.startMinutes === cfg.endMinutes) return false;

  const minute = now.getHours() * 60 + now.getMinutes();
  const { startMinutes: start, endMinutes: end } = cfg;

  if (start < end) {
    // Same-day window.
    return minute >= start && minute < end;
  }
  // Wrap-around window (crosses midnight): quiet from start..1439 OR 0..end-1.
  return minute >= start || minute < end;
}
