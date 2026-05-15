export type LeaveTemplate = {
  name: string;
  type: "annual" | "sick" | "personal" | "unpaid";
  reason: string;
  createdAt: number;
};

export const STORAGE_KEY = "cafe-hr-leave-templates";
export const MAX = 8;

const VALID_TYPES = new Set<LeaveTemplate["type"]>([
  "annual",
  "sick",
  "personal",
  "unpaid",
]);

function isLeaveTemplate(value: unknown): value is LeaveTemplate {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    v.name.length > 0 &&
    typeof v.type === "string" &&
    VALID_TYPES.has(v.type as LeaveTemplate["type"]) &&
    typeof v.reason === "string" &&
    typeof v.createdAt === "number" &&
    Number.isFinite(v.createdAt)
  );
}

function dispatchSync(serialized: string): void {
  // Same-tab listeners need a synthetic event — browsers only fire "storage" cross-tab.
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: serialized,
      storageArea: window.localStorage,
    }),
  );
}

export function loadLeaveTemplates(): LeaveTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isLeaveTemplate);
    valid.sort((a, b) => b.createdAt - a.createdAt);
    return valid.slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveLeaveTemplate(t: LeaveTemplate): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadLeaveTemplates();
    const next: LeaveTemplate[] = [
      t,
      ...current.filter((x) => x.name !== t.name),
    ].slice(0, MAX);
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    dispatchSync(serialized);
  } catch {
    // ignore quota / serialization errors
  }
}

export function removeLeaveTemplate(name: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = loadLeaveTemplates().filter((x) => x.name !== name);
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    dispatchSync(serialized);
  } catch {
    // ignore
  }
}
