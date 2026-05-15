// Client-only utilities for tracking which changelog version the user has acknowledged.
// Storage shape: localStorage["cafe-hr-changelog-last-read"] = "<version-string>"
// Version strings are compared lexicographically with a natural-segment fallback so
// "v1.10" sorts above "v1.9". See `compareVersions` below.

export const CHANGELOG_READ_KEY = "cafe-hr-changelog-last-read";
export const CHANGELOG_READ_EVENT = "cafe-hr:changelog-read-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Returns the last-read version string, or null when nothing stored / SSR. */
export function getLastRead(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(CHANGELOG_READ_KEY);
  } catch {
    return null;
  }
}

/** Persists `latest` as the last-read version and broadcasts to subscribers. */
export function setLastReadToLatest(latest: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CHANGELOG_READ_KEY, latest);
  } catch {
    return;
  }
  // Notify same-tab listeners (storage event normally only fires across tabs).
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CHANGELOG_READ_KEY,
        newValue: latest,
      }),
    );
  } catch {
    // StorageEvent constructor may throw in odd environments — ignore.
  }
  window.dispatchEvent(
    new CustomEvent<string>(CHANGELOG_READ_EVENT, { detail: latest }),
  );
}

/**
 * Compares two version strings ("v1.6", "v1.10") naturally.
 * Returns negative if `a < b`, positive if `a > b`, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (s: string): number[] =>
    s
      .replace(/^v/i, "")
      .split(/[.\-]/)
      .map((seg) => {
        const n = Number.parseInt(seg, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const av = parse(a);
  const bv = parse(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Returns true when `entryVersion` is newer than the recorded `lastRead`. */
export function isUnread(
  entryVersion: string,
  lastRead: string | null,
): boolean {
  if (!lastRead) return true;
  return compareVersions(entryVersion, lastRead) > 0;
}
