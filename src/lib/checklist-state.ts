export const STORAGE_KEY_PREFIX = "cafe-hr-checklist";
export const CHECKLIST_CHANGE_EVENT = "cafe-hr:checklist-changed";

export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function storageKeyFor(presetKey: string, date: string): string {
  return `${STORAGE_KEY_PREFIX}:${presetKey}:${date}`;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getChecked(presetKey: string, date: string): Set<string> {
  const storage = safeStorage();
  if (!storage) return new Set<string>();
  try {
    const raw = storage.getItem(storageKeyFor(presetKey, date));
    if (!raw) return new Set<string>();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    const ids: string[] = [];
    for (const v of parsed) {
      if (typeof v === "string") ids.push(v);
    }
    return new Set<string>(ids);
  } catch {
    return new Set<string>();
  }
}

function dispatchChange(key: string, newValue: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key,
        newValue,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // older browsers may not allow constructing StorageEvent — ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(CHECKLIST_CHANGE_EVENT, { detail: { key } }),
    );
  } catch {
    // ignore
  }
}

export function setChecked(
  presetKey: string,
  date: string,
  items: Set<string>,
): void {
  const storage = safeStorage();
  if (!storage) return;
  const key = storageKeyFor(presetKey, date);
  const value = JSON.stringify(Array.from(items));
  try {
    storage.setItem(key, value);
  } catch {
    return;
  }
  dispatchChange(key, value);
}

export function toggleItem(
  presetKey: string,
  date: string,
  itemId: string,
): boolean {
  const current = getChecked(presetKey, date);
  let nowChecked: boolean;
  if (current.has(itemId)) {
    current.delete(itemId);
    nowChecked = false;
  } else {
    current.add(itemId);
    nowChecked = true;
  }
  setChecked(presetKey, date, current);
  return nowChecked;
}

export function resetChecklist(presetKey: string, date: string): void {
  const storage = safeStorage();
  if (!storage) return;
  const key = storageKeyFor(presetKey, date);
  try {
    storage.removeItem(key);
  } catch {
    return;
  }
  dispatchChange(key, null);
}
