export const STORAGE_KEY = "cafe-hr-search-recents";
export const SEARCH_RECENTS_EVENT = "cafe-hr:search-recents-changed";

const MAX_RECENTS = 5;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function emitChange(): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent(SEARCH_RECENTS_EVENT));
  } catch {
    // ignore
  }
}

export function getRecents(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function pushRecent(query: string): void {
  if (!isBrowser()) return;
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = getRecents();
  const next = [trimmed, ...current.filter((q) => q !== trimmed)].slice(
    0,
    MAX_RECENTS,
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  } catch {
    // ignore quota
  }
}

export function clearRecents(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    emitChange();
  } catch {
    // ignore
  }
}
