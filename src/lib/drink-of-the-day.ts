import "server-only";

export type DrinkInfo = {
  name: string;
  tagline: string;
  imageUrl: string;
  generatedAt: string;
};

const MAX_ENTRIES = 16;

// Module-scoped LRU-ish cache. Module instance is shared across requests
// in a single server process. Display screen consumers call this on read
// and the server action calls setCachedDrink after generating.
const cache = new Map<string, DrinkInfo>();

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayKeyFor(d: Date): string {
  return dayKey(d);
}

export function getCachedDrink(today: Date): DrinkInfo | null {
  const key = dayKey(today);
  const entry = cache.get(key);
  if (!entry) return null;
  // Refresh recency by re-inserting
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

export function setCachedDrink(today: Date, info: DrinkInfo): void {
  const key = dayKey(today);
  if (cache.has(key)) cache.delete(key);
  cache.set(key, info);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}
