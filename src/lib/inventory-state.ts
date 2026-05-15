import { INVENTORY_ITEMS } from "./inventory-presets";

export const STORAGE_KEY = "cafe-hr-inventory";
export const INVENTORY_EVENT = "cafe-hr:inventory-changed";

export type InventoryEntry = { qty: number; updatedAt: string };
export type InventoryState = Record<string, InventoryEntry>;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseState(raw: string | null): InventoryState {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: InventoryState = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Record<string, unknown>;
      const qty = entry.qty;
      const updatedAt = entry.updatedAt;
      if (isFiniteNumber(qty) && typeof updatedAt === "string") {
        out[key] = { qty, updatedAt };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getInventoryState(): InventoryState {
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
    // older browsers may not allow constructing StorageEvent — ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(INVENTORY_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeState(next: InventoryState): void {
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

export function setItemQty(id: string, qty: number): void {
  if (!isFiniteNumber(qty)) return;
  const safeQty = qty < 0 ? 0 : qty;
  const rounded = Math.round(safeQty * 100) / 100;
  const current = getInventoryState();
  current[id] = { qty: rounded, updatedAt: new Date().toISOString() };
  writeState(current);
}

export function resetToDefaults(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  dispatchChange(null);
}

export function getQtyFor(state: InventoryState, id: string): number {
  const entry = state[id];
  if (entry) return entry.qty;
  const preset = INVENTORY_ITEMS.find((it) => it.id === id);
  return preset ? preset.defaultQty : 0;
}

export function getLatestUpdatedAt(state: InventoryState): string | null {
  let latest: string | null = null;
  for (const entry of Object.values(state)) {
    if (!latest || entry.updatedAt > latest) latest = entry.updatedAt;
  }
  return latest;
}
