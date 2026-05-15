export const STORAGE_KEY = "cafe-hr-suppliers";
export const SUPPLIERS_EVENT = "cafe-hr:suppliers-changed";

export type SupplierCategory =
  | "beans"
  | "milk"
  | "syrup"
  | "equipment"
  | "other";

export type Supplier = {
  id: string;
  name: string;
  category: SupplierCategory;
  origin: string;
  pricePerUnitVnd: number;
  unit: string;
  contact: string;
  lastOrderDate: string;
  notes: string;
  createdAt: string;
};

export const CATEGORY_LABEL: Record<SupplierCategory, string> = {
  beans: "Hạt cà phê",
  milk: "Sữa",
  syrup: "Syrup",
  equipment: "Thiết bị",
  other: "Khác",
};

export const CATEGORY_TINT: Record<SupplierCategory, string> = {
  beans: "border-l-amber-600 bg-amber-50/40 dark:bg-amber-950/20",
  milk: "border-l-sky-500 bg-sky-50/40 dark:bg-sky-950/20",
  syrup: "border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20",
  equipment: "border-l-slate-500 bg-slate-50/40 dark:bg-slate-900/30",
  other: "border-l-violet-500 bg-violet-50/40 dark:bg-violet-950/20",
};

export const CATEGORY_ICON: Record<
  SupplierCategory,
  "coffee" | "milk" | "flame" | "wrench" | "package"
> = {
  beans: "coffee",
  milk: "milk",
  syrup: "flame",
  equipment: "wrench",
  other: "package",
};

const ALL_CATEGORIES: readonly SupplierCategory[] = [
  "beans",
  "milk",
  "syrup",
  "equipment",
  "other",
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isCategory(v: unknown): v is SupplierCategory {
  return typeof v === "string" && (ALL_CATEGORIES as readonly string[]).includes(v);
}

function isSupplier(v: unknown): v is Supplier {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    isCategory(o.category) &&
    typeof o.origin === "string" &&
    typeof o.pricePerUnitVnd === "number" &&
    Number.isFinite(o.pricePerUnitVnd) &&
    typeof o.unit === "string" &&
    typeof o.contact === "string" &&
    typeof o.lastOrderDate === "string" &&
    (o.lastOrderDate === "" || ISO_DATE_RE.test(o.lastOrderDate)) &&
    typeof o.notes === "string" &&
    typeof o.createdAt === "string"
  );
}

export function getSuppliers(): Supplier[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Supplier[] = [];
    for (const v of parsed) {
      if (isSupplier(v)) out.push(v);
    }
    return out;
  } catch {
    return [];
  }
}

function dispatchChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(SUPPLIERS_EVENT));
  } catch {
    // ignore
  }
}

function writeSuppliers(suppliers: Supplier[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
  } catch {
    return;
  }
  dispatchChange();
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addSupplier(
  input: Omit<Supplier, "id" | "createdAt">,
): Supplier {
  const entry: Supplier = {
    id: makeId(),
    name: input.name.trim().slice(0, 120),
    category: input.category,
    origin: input.origin.trim().slice(0, 200),
    pricePerUnitVnd: Number.isFinite(input.pricePerUnitVnd)
      ? Math.max(0, Math.round(input.pricePerUnitVnd))
      : 0,
    unit: input.unit.trim().slice(0, 30) || "kg",
    contact: input.contact.trim().slice(0, 300),
    lastOrderDate:
      input.lastOrderDate && ISO_DATE_RE.test(input.lastOrderDate)
        ? input.lastOrderDate
        : "",
    notes: input.notes.trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  const all = getSuppliers();
  all.push(entry);
  writeSuppliers(all);
  return entry;
}

export function updateSupplier(id: string, patch: Partial<Supplier>): void {
  const all = getSuppliers();
  let changed = false;
  const next = all.map((s) => {
    if (s.id !== id) return s;
    changed = true;
    const merged: Supplier = {
      ...s,
      ...patch,
      id: s.id,
      createdAt: s.createdAt,
    };
    if (!isCategory(merged.category)) merged.category = s.category;
    if (
      merged.lastOrderDate !== "" &&
      !ISO_DATE_RE.test(merged.lastOrderDate)
    ) {
      merged.lastOrderDate = s.lastOrderDate;
    }
    if (!Number.isFinite(merged.pricePerUnitVnd)) {
      merged.pricePerUnitVnd = s.pricePerUnitVnd;
    } else {
      merged.pricePerUnitVnd = Math.max(0, Math.round(merged.pricePerUnitVnd));
    }
    return merged;
  });
  if (!changed) return;
  writeSuppliers(next);
}

export function removeSupplier(id: string): void {
  const all = getSuppliers();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return;
  writeSuppliers(next);
}

export function markOrdered(id: string): void {
  updateSupplier(id, { lastOrderDate: todayIso() });
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysSinceOrder(s: Supplier): number | null {
  if (!s.lastOrderDate || !ISO_DATE_RE.test(s.lastOrderDate)) return null;
  const [y, m, d] = s.lastOrderDate.split("-").map(Number);
  const past = Date.UTC(y, m - 1, d);
  const today = new Date();
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((now - past) / MS_PER_DAY);
}
