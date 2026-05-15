// Plain client utility for tracking daily cafe revenue.
// Persists in localStorage under STORAGE_KEY. SSR-safe (no-ops on the server).
// On every write we dispatch a custom event AND a synthetic StorageEvent so
// other tabs/components can react in real time.

export const STORAGE_KEY = "cafe-hr-revenue";
export const REVENUE_EVENT = "cafe-hr:revenue-changed";

export type RevenueEntry = { date: string; amount: number }; // YYYY-MM-DD

type RevenueMap = Record<string, number>;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readMap(): RevenueMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: RevenueMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k !== "string") continue;
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n > 0) {
        out[k] = n;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: RevenueMap): void {
  if (!isBrowser()) return;
  try {
    const serialized = JSON.stringify(map);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    // Cross-tab: native storage events fire in OTHER tabs; we synthesize one
    // here so listeners in the SAME tab also pick it up uniformly.
    try {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: serialized,
        }),
      );
    } catch {
      // Some browsers disallow constructing StorageEvent — ignore.
    }
    window.dispatchEvent(new CustomEvent(REVENUE_EVENT));
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

export function getAllRevenue(): RevenueEntry[] {
  const map = readMap();
  return Object.entries(map)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function getRevenueFor(dateIso: string): number | null {
  const map = readMap();
  return Object.prototype.hasOwnProperty.call(map, dateIso) ? map[dateIso] : null;
}

export function setRevenueFor(dateIso: string, amount: number): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return;
  const map = readMap();
  if (!Number.isFinite(amount) || amount <= 0) {
    if (Object.prototype.hasOwnProperty.call(map, dateIso)) {
      delete map[dateIso];
      writeMap(map);
    }
    return;
  }
  map[dateIso] = Math.round(amount);
  writeMap(map);
}

export function getLastNDaysRevenue(n: number): RevenueEntry[] {
  const map = readMap();
  const out: RevenueEntry[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toIsoDate(d);
    out.push({ date: iso, amount: map[iso] ?? 0 });
  }
  return out;
}
