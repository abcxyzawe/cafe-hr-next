export const STORAGE_KEY = "cafe-hr-wins";
export const WINS_EVENT = "cafe-hr:wins-changed";

export type WinEntry = {
  id: string;
  emoji: string;
  text: string;
  authorName?: string;
  createdAt: string;
  likes: number;
};

export const DEFAULT_EMOJIS: string[] = [
  "🎉",
  "☕",
  "✨",
  "💪",
  "🏆",
  "🤝",
  "😊",
  "🚀",
];

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isWinEntry(v: unknown): v is WinEntry {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.emoji === "string" &&
    typeof o.text === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.likes === "number" &&
    (o.authorName === undefined || typeof o.authorName === "string")
  );
}

export function getWins(): WinEntry[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: WinEntry[] = [];
    for (const v of parsed) {
      if (isWinEntry(v)) out.push(v);
    }
    return out;
  } catch {
    return [];
  }
}

function writeWins(wins: WinEntry[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(wins));
  } catch {
    return;
  }
  dispatchChange();
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
    // ignore older browsers
  }
  try {
    window.dispatchEvent(new CustomEvent(WINS_EVENT));
  } catch {
    // ignore
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `win-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addWin(input: {
  emoji: string;
  text: string;
  authorName?: string;
}): WinEntry {
  const text = input.text.trim().slice(0, 200);
  const emoji = input.emoji.trim() || "✨";
  const authorName = input.authorName?.trim() || undefined;
  const entry: WinEntry = {
    id: makeId(),
    emoji,
    text,
    authorName,
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  const all = getWins();
  all.unshift(entry);
  writeWins(all);
  return entry;
}

export function deleteWin(id: string): void {
  const all = getWins();
  const next = all.filter((w) => w.id !== id);
  if (next.length === all.length) return;
  writeWins(next);
}

export function incrementLike(id: string): void {
  const all = getWins();
  let changed = false;
  for (const w of all) {
    if (w.id === id) {
      w.likes += 1;
      changed = true;
      break;
    }
  }
  if (!changed) return;
  writeWins(all);
}
