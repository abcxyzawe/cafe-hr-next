/**
 * Per-admin "starred entity" list, persisted in localStorage.
 *
 * A starred entity is identified by a `StarKey` of the form `"{type}:{id}"`,
 * e.g. `"employee:5"` or `"leave:42"`. The audit page uses this to filter
 * rows; the realtime toaster uses it to flag matching events with a star
 * prefix.
 *
 * State is browser-local (per admin). All reads are SSR-safe.
 */

export const STORAGE_KEY = "cafe-hr-starred-entities";
export const MAX = 50;

export type StarKey = string; // `"{type}:{id}"`

export function makeKey(type: string, id: number): StarKey {
  return `${type}:${id}`;
}

function isValidKey(k: unknown): k is StarKey {
  if (typeof k !== "string") return false;
  // shape: "<type>:<positive-int>"
  const m = /^([a-zA-Z][\w.-]*):(\d+)$/.exec(k);
  return m !== null;
}

/**
 * Read & parse the starred set from localStorage. Always returns a fresh
 * Set; deduped and capped to MAX entries (entries past the cap are dropped).
 * SSR-safe — returns an empty set when window is undefined.
 */
export function loadStars(): Set<StarKey> {
  if (typeof window === "undefined") return new Set<StarKey>();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<StarKey>();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<StarKey>();
    const out = new Set<StarKey>();
    for (const item of parsed) {
      if (!isValidKey(item)) continue;
      out.add(item);
      if (out.size >= MAX) break;
    }
    return out;
  } catch {
    return new Set<StarKey>();
  }
}

function persist(set: Set<StarKey>): void {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(set).slice(0, MAX);
    const json = JSON.stringify(arr);
    window.localStorage.setItem(STORAGE_KEY, json);
    // Same-tab listeners don't get a native `storage` event — dispatch one
    // ourselves so any subscribed UI updates live.
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: json,
      }),
    );
  } catch {
    // ignore quota / serialization errors
  }
}

/**
 * Toggle the starred state for `{type}:{id}`. Returns the new state
 * (`true` = now starred, `false` = removed). When adding past MAX, the
 * earliest entry is dropped to keep the cap.
 */
export function toggleStar(type: string, id: number): boolean {
  const key = makeKey(type, id);
  const set = loadStars();
  if (set.has(key)) {
    set.delete(key);
    persist(set);
    return false;
  }
  // enforce MAX cap by dropping the first (earliest insertion) entry
  if (set.size >= MAX) {
    const first = set.values().next().value;
    if (typeof first === "string") set.delete(first);
  }
  set.add(key);
  persist(set);
  return true;
}

/** Synchronous read — true iff `{type}:{id}` is currently starred. */
export function isStarred(type: string, id: number): boolean {
  if (typeof window === "undefined") return false;
  return loadStars().has(makeKey(type, id));
}
