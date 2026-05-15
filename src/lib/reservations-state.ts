export const STORAGE_KEY = "cafe-hr-reservations";
export const RESERVATIONS_EVENT = "cafe-hr:reservations-changed";

export type Reservation = {
  id: string;
  name: string;
  phone: string;
  datetime: string; // ISO
  partySize: number;
  notes: string;
  arrived: boolean;
  createdAt: string;
};

export type ReservationInput = Omit<
  Reservation,
  "id" | "arrived" | "createdAt"
>;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseList(raw: string | null): Reservation[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Reservation[] = [];
    for (const v of parsed) {
      if (!v || typeof v !== "object") continue;
      const r = v as Record<string, unknown>;
      const id = r.id;
      const name = r.name;
      const phone = r.phone;
      const datetime = r.datetime;
      const partySize = r.partySize;
      const notes = r.notes;
      const arrived = r.arrived;
      const createdAt = r.createdAt;
      if (
        isString(id) &&
        isString(name) &&
        isString(phone) &&
        isString(datetime) &&
        isFiniteNumber(partySize) &&
        isString(notes) &&
        typeof arrived === "boolean" &&
        isString(createdAt)
      ) {
        out.push({
          id,
          name,
          phone,
          datetime,
          partySize,
          notes,
          arrived,
          createdAt,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function getReservations(): Reservation[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return parseList(storage.getItem(STORAGE_KEY));
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
    // older browsers may not allow constructing StorageEvent — ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(RESERVATIONS_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeList(next: Reservation[]): void {
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
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addReservation(input: ReservationInput): Reservation {
  const reservation: Reservation = {
    id: newId(),
    name: input.name,
    phone: input.phone,
    datetime: input.datetime,
    partySize: input.partySize,
    notes: input.notes,
    arrived: false,
    createdAt: new Date().toISOString(),
  };
  const list = getReservations();
  list.push(reservation);
  writeList(list);
  return reservation;
}

export function updateReservation(
  id: string,
  patch: Partial<Reservation>,
): void {
  const list = getReservations();
  let changed = false;
  const next = list.map((r) => {
    if (r.id !== id) return r;
    changed = true;
    return {
      ...r,
      ...patch,
      id: r.id, // never mutate id via patch
      createdAt: r.createdAt, // preserve createdAt
    };
  });
  if (!changed) return;
  writeList(next);
}

export function deleteReservation(id: string): void {
  const list = getReservations();
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return;
  writeList(next);
}

export function toggleArrived(id: string): void {
  const list = getReservations();
  let changed = false;
  const next = list.map((r) => {
    if (r.id !== id) return r;
    changed = true;
    return { ...r, arrived: !r.arrived };
  });
  if (!changed) return;
  writeList(next);
}
