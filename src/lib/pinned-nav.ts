/**
 * Pinned sidebar nav items, persisted in localStorage as a `string[]` of href
 * values. Cross-tab and same-tab listeners receive a synthetic StorageEvent on
 * write so subscribed UIs can update live.
 */

export const STORAGE_KEY = "cafe-hr-pinned-nav";
export const MAX_PINNED = 5;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** SSR-safe read; returns `[]` when window is undefined or storage is bad. */
export function getPinned(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isStringArray(parsed)) return [];
    // dedupe + cap
    const seen = new Set<string>();
    const out: string[] = [];
    for (const href of parsed) {
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
      if (out.length >= MAX_PINNED) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Persist & broadcast. Caps to MAX_PINNED, dedupes. SSR-safe (noop on server). */
export function setPinned(hrefs: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const seen = new Set<string>();
    const next: string[] = [];
    for (const href of hrefs) {
      if (typeof href !== "string" || seen.has(href)) continue;
      seen.add(href);
      next.push(href);
      if (next.length >= MAX_PINNED) break;
    }
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    // Same-tab listeners don't get a native `storage` event — synthesize one.
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: serialized,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore quota / serialization errors
  }
}
