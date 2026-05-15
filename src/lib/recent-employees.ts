export type RecentEmployee = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  viewedAt: number;
};

export const STORAGE_KEY = "cafe-hr-recent-employees";
export const MAX = 10;

function isRecentEmployee(value: unknown): value is RecentEmployee {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    Number.isFinite(v.id) &&
    typeof v.name === "string" &&
    (v.avatarUrl === null || typeof v.avatarUrl === "string") &&
    typeof v.role === "string" &&
    typeof v.viewedAt === "number" &&
    Number.isFinite(v.viewedAt)
  );
}

export function loadRecentEmployees(): RecentEmployee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isRecentEmployee);
    valid.sort((a, b) => b.viewedAt - a.viewedAt);
    return valid.slice(0, MAX);
  } catch {
    return [];
  }
}

export function recordRecentEmployee(emp: Omit<RecentEmployee, "viewedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadRecentEmployees();
    const next: RecentEmployee[] = [
      { ...emp, viewedAt: Date.now() },
      ...current.filter((e) => e.id !== emp.id),
    ].slice(0, MAX);
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    // Browsers don't fire "storage" in the same tab — synthesize one so listeners react.
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
