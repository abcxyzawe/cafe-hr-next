export const STORAGE_KEY = "cafe-hr-saved-quotes";
export const SAVED_QUOTES_EVENT = "cafe-hr:saved-quotes-changed";

export function getSavedQuotes(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n)),
    );
  } catch {
    return new Set();
  }
}

export function isQuoteSaved(id: number): boolean {
  return getSavedQuotes().has(id);
}

export function toggleSavedQuote(id: number): boolean {
  const set = getSavedQuotes();
  const wasSaved = set.has(id);
  if (wasSaved) set.delete(id);
  else set.add(id);
  writeSavedQuotes(set);
  return !wasSaved;
}

function writeSavedQuotes(set: Set<number>): void {
  if (typeof window === "undefined") return;
  const arr = Array.from(set);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: JSON.stringify(arr),
    }),
  );
  window.dispatchEvent(new Event(SAVED_QUOTES_EVENT));
}
