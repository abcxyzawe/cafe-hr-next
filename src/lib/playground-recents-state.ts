export const STORAGE_KEY = "cafe-hr-playground-recents";
export const PLAYGROUND_EVENT = "cafe-hr:playground-changed";
export const MAX_RECENTS = 6;

export type PlaygroundEntry = {
  id: string;
  prompt: string;
  url: string;
  createdAt: string;
};

function isPlaygroundEntry(value: unknown): value is PlaygroundEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.prompt === "string" &&
    typeof v.url === "string" &&
    typeof v.createdAt === "string"
  );
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function notifyChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(PLAYGROUND_EVENT));
  } catch {
    // ignore
  }
}

function readAll(): PlaygroundEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPlaygroundEntry);
  } catch {
    return [];
  }
}

function writeAll(entries: PlaygroundEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_RECENTS)),
    );
    notifyChange();
  } catch {
    // ignore quota / serialization errors
  }
}

export function getRecents(): PlaygroundEntry[] {
  return readAll().slice(0, MAX_RECENTS);
}

export function addRecent(input: {
  prompt: string;
  url: string;
}): PlaygroundEntry {
  const entry: PlaygroundEntry = {
    id: generateId(),
    prompt: input.prompt,
    url: input.url,
    createdAt: new Date().toISOString(),
  };
  if (typeof window === "undefined") return entry;
  const next = [entry, ...readAll()].slice(0, MAX_RECENTS);
  writeAll(next);
  return entry;
}

export function clearRecents(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    notifyChange();
  } catch {
    // ignore
  }
}

export function removeRecent(id: string): void {
  if (typeof window === "undefined") return;
  const next = readAll().filter((e) => e.id !== id);
  writeAll(next);
}
