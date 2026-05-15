export const STORAGE_KEY = "cafe-hr-waiting-list";
export const WAITING_EVENT = "cafe-hr:waiting-list-changed";

export type WaitingStatus = "waiting" | "seated" | "left";

export type WaitingEntry = {
  id: string;
  name: string;
  partySize: number;
  phone: string;
  arrivedAt: string; // ISO
  status: WaitingStatus;
  notifiedAt: string | null;
  seatedAt: string | null;
};

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isStatus(v: unknown): v is WaitingStatus {
  return v === "waiting" || v === "seated" || v === "left";
}

function clampPartySize(n: number): number {
  if (!Number.isFinite(n)) return 1;
  const i = Math.round(n);
  if (i < 1) return 1;
  if (i > 10) return 10;
  return i;
}

function parseEntries(raw: string | null): WaitingEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: WaitingEntry[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = o.id;
      const name = o.name;
      const partySize = o.partySize;
      const phone = o.phone;
      const arrivedAt = o.arrivedAt;
      const status = o.status;
      const notifiedAt = o.notifiedAt;
      const seatedAt = o.seatedAt;
      if (
        typeof id !== "string" ||
        typeof name !== "string" ||
        typeof partySize !== "number" ||
        typeof arrivedAt !== "string" ||
        !isStatus(status)
      ) {
        continue;
      }
      out.push({
        id,
        name,
        partySize: clampPartySize(partySize),
        phone: typeof phone === "string" ? phone : "",
        arrivedAt,
        status,
        notifiedAt:
          typeof notifiedAt === "string" || notifiedAt === null
            ? (notifiedAt as string | null)
            : null,
        seatedAt:
          typeof seatedAt === "string" || seatedAt === null
            ? (seatedAt as string | null)
            : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function getEntries(): WaitingEntry[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return parseEntries(storage.getItem(STORAGE_KEY));
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
      new CustomEvent(WAITING_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeEntries(next: WaitingEntry[]): void {
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
  return `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addEntry(input: {
  name: string;
  partySize: number;
  phone?: string;
}): WaitingEntry {
  const entry: WaitingEntry = {
    id: newId(),
    name: input.name.trim(),
    partySize: clampPartySize(input.partySize),
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    arrivedAt: new Date().toISOString(),
    status: "waiting",
    notifiedAt: null,
    seatedAt: null,
  };
  const current = getEntries();
  current.push(entry);
  writeEntries(current);
  return entry;
}

export function setStatus(id: string, status: WaitingStatus): void {
  if (!id) return;
  const current = getEntries();
  let changed = false;
  for (let i = 0; i < current.length; i += 1) {
    const e = current[i];
    if (e.id !== id) continue;
    const seatedAt =
      status === "seated"
        ? (e.seatedAt ?? new Date().toISOString())
        : status === "waiting"
          ? null
          : e.seatedAt;
    current[i] = { ...e, status, seatedAt };
    changed = true;
    break;
  }
  if (changed) writeEntries(current);
}

export function notify(id: string): void {
  if (!id) return;
  const current = getEntries();
  let changed = false;
  for (let i = 0; i < current.length; i += 1) {
    const e = current[i];
    if (e.id !== id) continue;
    current[i] = { ...e, notifiedAt: new Date().toISOString() };
    changed = true;
    break;
  }
  if (changed) writeEntries(current);
}

export function removeEntry(id: string): void {
  if (!id) return;
  const current = getEntries();
  const next = current.filter((e) => e.id !== id);
  if (next.length !== current.length) writeEntries(next);
}

export function clearStale(maxAgeHours: number = 24): number {
  const current = getEntries();
  const cutoff = Date.now() - maxAgeHours * 3_600_000;
  const next = current.filter((e) => {
    if (e.status === "waiting") return true;
    const ref = e.seatedAt ?? e.arrivedAt;
    const t = Date.parse(ref);
    if (Number.isNaN(t)) return true;
    return t >= cutoff;
  });
  const removed = current.length - next.length;
  if (removed > 0) writeEntries(next);
  return removed;
}
