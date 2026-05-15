export const STORAGE_KEY = "cafe-hr-events";
export const EVENTS_EVENT = "cafe-hr:events-changed";

export type EventCategory =
  | "tasting"
  | "workshop"
  | "promotion"
  | "live-music"
  | "holiday";

export type CafeEvent = {
  id: string;
  title: string;
  category: EventCategory;
  datetime: string; // ISO
  location: string;
  description: string;
  capacity: number | null;
  createdAt: string;
};

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  tasting: "Thử nếm",
  workshop: "Workshop",
  promotion: "Khuyến mãi",
  "live-music": "Live music",
  holiday: "Sự kiện lễ",
};

export const CATEGORY_TINT: Record<EventCategory, string> = {
  tasting: "amber",
  workshop: "sky",
  promotion: "rose",
  "live-music": "violet",
  holiday: "emerald",
};

export const CATEGORY_ICON: Record<
  EventCategory,
  "coffee" | "sparkles" | "tag" | "music" | "calendar-heart"
> = {
  tasting: "coffee",
  workshop: "sparkles",
  promotion: "tag",
  "live-music": "music",
  holiday: "calendar-heart",
};

const VALID_CATEGORIES: ReadonlyArray<EventCategory> = [
  "tasting",
  "workshop",
  "promotion",
  "live-music",
  "holiday",
];

function isCategory(v: unknown): v is EventCategory {
  return typeof v === "string" && (VALID_CATEGORIES as ReadonlyArray<string>).includes(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseList(raw: string | null): CafeEvent[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: CafeEvent[] = [];
    for (const v of parsed) {
      if (!v || typeof v !== "object") continue;
      const r = v as Record<string, unknown>;
      const id = r.id;
      const title = r.title;
      const category = r.category;
      const datetime = r.datetime;
      const location = r.location;
      const description = r.description;
      const capacity = r.capacity;
      const createdAt = r.createdAt;
      if (
        isString(id) &&
        isString(title) &&
        isCategory(category) &&
        isString(datetime) &&
        isString(location) &&
        isString(description) &&
        (capacity === null || isFiniteNumber(capacity)) &&
        isString(createdAt)
      ) {
        out.push({
          id,
          title,
          category,
          datetime,
          location,
          description,
          capacity: capacity === null ? null : Math.max(0, Math.round(capacity)),
          createdAt,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function getEvents(): CafeEvent[] {
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
    // ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(EVENTS_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeList(next: CafeEvent[]): void {
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
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addEvent(
  input: Omit<CafeEvent, "id" | "createdAt">,
): CafeEvent {
  const event: CafeEvent = {
    id: newId(),
    title: input.title,
    category: input.category,
    datetime: input.datetime,
    location: input.location,
    description: input.description,
    capacity: input.capacity,
    createdAt: new Date().toISOString(),
  };
  const list = getEvents();
  list.push(event);
  writeList(list);
  return event;
}

export function updateEvent(id: string, patch: Partial<CafeEvent>): void {
  const list = getEvents();
  let changed = false;
  const next = list.map((e) => {
    if (e.id !== id) return e;
    changed = true;
    return {
      ...e,
      ...patch,
      id: e.id,
      createdAt: e.createdAt,
    };
  });
  if (!changed) return;
  writeList(next);
}

export function removeEvent(id: string): void {
  const list = getEvents();
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return;
  writeList(next);
}

const WEEKDAYS_VI: ReadonlyArray<string> = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatAnnouncement(e: CafeEvent): string {
  const d = new Date(e.datetime);
  const dateLine = Number.isNaN(d.getTime())
    ? e.datetime
    : `${WEEKDAYS_VI[d.getDay()]}, ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} lúc ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const lines: string[] = [];
  lines.push(`[${CATEGORY_LABEL[e.category].toUpperCase()}] ${e.title}`);
  lines.push("");
  lines.push(`Thời gian: ${dateLine}`);
  lines.push(`Địa điểm: ${e.location}`);
  if (e.capacity !== null && e.capacity > 0) {
    lines.push(`Số chỗ: ${e.capacity} người`);
  }
  if (e.description.trim()) {
    lines.push("");
    lines.push(e.description.trim());
  }
  lines.push("");
  lines.push("Hẹn gặp các bạn tại quán nhé! ☕");
  return lines.join("\n");
}
