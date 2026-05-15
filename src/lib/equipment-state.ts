export const STORAGE_KEY = "cafe-hr-equipment";
export const EQUIPMENT_EVENT = "cafe-hr:equipment-changed";

export type EquipmentRecord = {
  lastServiced: string;
  notes: string;
  updatedAt: string;
};

export type EquipmentState = Record<string, EquipmentRecord>;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseState(raw: string | null): EquipmentState {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: EquipmentState = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Record<string, unknown>;
      const lastServiced = entry.lastServiced;
      const notes = entry.notes;
      const updatedAt = entry.updatedAt;
      if (
        typeof lastServiced === "string" &&
        ISO_DATE_RE.test(lastServiced) &&
        typeof updatedAt === "string"
      ) {
        out[key] = {
          lastServiced,
          notes: typeof notes === "string" ? notes : "",
          updatedAt,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getEquipmentState(): EquipmentState {
  const storage = safeStorage();
  if (!storage) return {};
  try {
    return parseState(storage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

function dispatchChange(newValue: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(EQUIPMENT_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeState(next: EquipmentState): void {
  const storage = safeStorage();
  if (!storage) return;
  const value = JSON.stringify(next);
  try {
    storage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
  dispatchChange(value);
}

function todayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function recordService(id: string, notes?: string): void {
  if (!id) return;
  const current = getEquipmentState();
  const existing = current[id];
  const nextNotes =
    typeof notes === "string" ? notes : (existing?.notes ?? "");
  current[id] = {
    lastServiced: todayIso(),
    notes: nextNotes,
    updatedAt: new Date().toISOString(),
  };
  writeState(current);
}

export function updateNotes(id: string, notes: string): void {
  if (!id) return;
  const current = getEquipmentState();
  const existing = current[id];
  if (!existing) return;
  current[id] = {
    ...existing,
    notes,
    updatedAt: new Date().toISOString(),
  };
  writeState(current);
}

export function resetAll(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  dispatchChange(null);
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysSince(iso: string, today: Date = new Date()): number {
  if (!iso || !ISO_DATE_RE.test(iso)) return Number.POSITIVE_INFINITY;
  const [y, m, d] = iso.split("-").map(Number);
  const past = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((now - past) / MS_PER_DAY);
  return diff;
}

export function statusFor(
  record: EquipmentRecord | undefined,
  intervalDays: number,
): "ok" | "due-soon" | "overdue" | "never-serviced" {
  if (!record) return "never-serviced";
  const since = daysSince(record.lastServiced);
  if (since >= intervalDays) return "overdue";
  if (intervalDays - since < 7) return "due-soon";
  return "ok";
}
