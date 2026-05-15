import {
  TIER_OPTIONS,
  type LoyaltyCustomer,
  type LoyaltyTier,
} from "./loyalty-types";

export const STORAGE_KEY = "cafe-hr-loyalty";
export const LOYALTY_EVENT = "cafe-hr:loyalty-changed";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isTier(v: unknown): v is LoyaltyTier {
  return (
    typeof v === "string" && (TIER_OPTIONS as ReadonlyArray<string>).includes(v)
  );
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseCustomers(raw: string | null): LoyaltyCustomer[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: LoyaltyCustomer[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const id = r.id;
      const name = r.name;
      const phone = r.phone;
      const notes = r.notes;
      const tier = r.tier;
      const visitCount = r.visitCount;
      const lastVisit = r.lastVisit;
      const createdAt = r.createdAt;
      if (
        typeof id !== "string" ||
        typeof name !== "string" ||
        typeof phone !== "string" ||
        typeof notes !== "string" ||
        !isTier(tier) ||
        !isFiniteNumber(visitCount) ||
        !(lastVisit === null || typeof lastVisit === "string") ||
        typeof createdAt !== "string"
      ) {
        continue;
      }
      out.push({
        id,
        name,
        phone,
        notes,
        tier,
        visitCount,
        lastVisit,
        createdAt,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function getCustomers(): LoyaltyCustomer[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return parseCustomers(storage.getItem(STORAGE_KEY));
  } catch {
    return [];
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
      new CustomEvent(LOYALTY_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeCustomers(next: LoyaltyCustomer[]): void {
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

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // fallback (should not happen in modern browsers / node 19+)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addCustomer(
  input: Omit<
    LoyaltyCustomer,
    "id" | "visitCount" | "lastVisit" | "createdAt"
  >,
): LoyaltyCustomer {
  const customer: LoyaltyCustomer = {
    id: newId(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    notes: input.notes.trim(),
    tier: input.tier,
    visitCount: 0,
    lastVisit: null,
    createdAt: new Date().toISOString(),
  };
  const list = getCustomers();
  list.push(customer);
  writeCustomers(list);
  return customer;
}

export function updateCustomer(
  id: string,
  patch: Partial<LoyaltyCustomer>,
): void {
  const list = getCustomers();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const current = list[idx];
  const next: LoyaltyCustomer = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
  };
  // Sanitize string fields if present in patch
  if (typeof patch.name === "string") next.name = patch.name.trim();
  if (typeof patch.phone === "string") next.phone = patch.phone.trim();
  if (typeof patch.notes === "string") next.notes = patch.notes.trim();
  list[idx] = next;
  writeCustomers(list);
}

export function deleteCustomer(id: string): void {
  const list = getCustomers().filter((c) => c.id !== id);
  writeCustomers(list);
}

export function recordVisit(id: string): void {
  const list = getCustomers();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const current = list[idx];
  list[idx] = {
    ...current,
    visitCount: current.visitCount + 1,
    lastVisit: new Date().toISOString(),
  };
  writeCustomers(list);
}
