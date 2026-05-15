export type HoursGoal = {
  employeeId: number;
  goal: number;
  updatedAt: number;
};

export const STORAGE_KEY = "cafe-hr-hours-goals";
export const MAX_ENTRIES = 200;

function isHoursGoal(value: unknown): value is HoursGoal {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.employeeId === "number" &&
    Number.isFinite(v.employeeId) &&
    typeof v.goal === "number" &&
    Number.isFinite(v.goal) &&
    v.goal > 0 &&
    typeof v.updatedAt === "number" &&
    Number.isFinite(v.updatedAt)
  );
}

export function loadGoals(): Map<number, HoursGoal> {
  const map = new Map<number, HoursGoal>();
  if (typeof window === "undefined") return map;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return map;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return map;
    const valid = parsed.filter(isHoursGoal);
    // Keep newest first when truncating
    valid.sort((a, b) => b.updatedAt - a.updatedAt);
    for (const g of valid.slice(0, MAX_ENTRIES)) {
      map.set(g.employeeId, g);
    }
    return map;
  } catch {
    return map;
  }
}

function persist(map: Map<number, HoursGoal>): void {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(map.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    const trimmed = arr.slice(0, MAX_ENTRIES);
    const serialized = JSON.stringify(trimmed);
    window.localStorage.setItem(STORAGE_KEY, serialized);
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

export function saveGoal(employeeId: number, goal: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(employeeId) || !Number.isFinite(goal) || goal <= 0) {
    return;
  }
  const map = loadGoals();
  map.set(employeeId, {
    employeeId,
    goal,
    updatedAt: Date.now(),
  });
  persist(map);
}

export function removeGoal(employeeId: number): void {
  if (typeof window === "undefined") return;
  const map = loadGoals();
  if (!map.delete(employeeId)) return;
  persist(map);
}

export function getGoal(employeeId: number): number | null {
  const map = loadGoals();
  const entry = map.get(employeeId);
  return entry ? entry.goal : null;
}
