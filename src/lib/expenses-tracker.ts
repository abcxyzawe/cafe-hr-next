// Plain client utility for tracking daily cafe expenses by category.
// Persists in localStorage under STORAGE_KEY. SSR-safe (no-ops on the server).
// On every write we dispatch a custom event AND a synthetic StorageEvent so
// other tabs/components can react in real time.

export const STORAGE_KEY = "cafe-hr-expenses";
export const EXPENSES_EVENT = "cafe-hr:expenses-changed";

export type ExpenseCategory =
  | "ingredients"
  | "utilities"
  | "wages"
  | "marketing"
  | "other";

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  ingredients: "Nguyên liệu",
  utilities: "Tiện ích",
  wages: "Lương ngoài app",
  marketing: "Marketing",
  other: "Khác",
};

// Tailwind-inspired hex palette suitable for stacked bars.
export const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  ingredients: "#f97316", // orange-500
  utilities: "#0ea5e9", // sky-500
  wages: "#a855f7", // purple-500
  marketing: "#ec4899", // pink-500
  other: "#64748b", // slate-500
};

export const CATEGORY_ORDER: readonly ExpenseCategory[] = [
  "ingredients",
  "utilities",
  "wages",
  "marketing",
  "other",
] as const;

export type ExpenseDay = {
  date: string; // YYYY-MM-DD
  ingredients: number;
  utilities: number;
  wages: number;
  marketing: number;
  other: number;
};

type StoredEntry = Partial<Record<ExpenseCategory, number>>;
type ExpenseStore = Record<string, StoredEntry>;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emptyDay(date: string): ExpenseDay {
  return {
    date,
    ingredients: 0,
    utilities: 0,
    wages: 0,
    marketing: 0,
    other: 0,
  };
}

function isCategory(value: string): value is ExpenseCategory {
  return (
    value === "ingredients" ||
    value === "utilities" ||
    value === "wages" ||
    value === "marketing" ||
    value === "other"
  );
}

function readStore(): ExpenseStore {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ExpenseStore = {};
    for (const [date, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const entry: StoredEntry = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (!isCategory(k)) continue;
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n) && n > 0) {
          entry[k] = Math.round(n);
        }
      }
      if (Object.keys(entry).length > 0) {
        out[date] = entry;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore(store: ExpenseStore): void {
  if (!isBrowser()) return;
  try {
    const serialized = JSON.stringify(store);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    try {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: serialized,
        }),
      );
    } catch {
      // some browsers disallow constructing StorageEvent — ignore
    }
    window.dispatchEvent(new CustomEvent(EXPENSES_EVENT));
  } catch {
    // quota / privacy mode — silently swallow
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function entryToDay(date: string, entry: StoredEntry): ExpenseDay {
  return {
    date,
    ingredients: entry.ingredients ?? 0,
    utilities: entry.utilities ?? 0,
    wages: entry.wages ?? 0,
    marketing: entry.marketing ?? 0,
    other: entry.other ?? 0,
  };
}

export function getAllExpenses(): ExpenseDay[] {
  const store = readStore();
  return Object.entries(store)
    .map(([date, entry]) => entryToDay(date, entry))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function getExpenseFor(date: string): ExpenseDay | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const store = readStore();
  if (!Object.prototype.hasOwnProperty.call(store, date)) return null;
  return entryToDay(date, store[date]);
}

export function setExpenseFor(
  date: string,
  category: ExpenseCategory,
  amount: number,
): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const store = readStore();
  const entry: StoredEntry = { ...(store[date] ?? {}) };
  if (!Number.isFinite(amount) || amount <= 0) {
    delete entry[category];
  } else {
    entry[category] = Math.round(amount);
  }
  if (Object.keys(entry).length === 0) {
    delete store[date];
  } else {
    store[date] = entry;
  }
  writeStore(store);
}

export function getLastNDaysExpenses(n: number): ExpenseDay[] {
  const store = readStore();
  const out: ExpenseDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toIsoDate(d);
    const entry = store[iso];
    out.push(entry ? entryToDay(iso, entry) : emptyDay(iso));
  }
  return out;
}

export function dayTotal(day: ExpenseDay): number {
  return (
    day.ingredients +
    day.utilities +
    day.wages +
    day.marketing +
    day.other
  );
}
