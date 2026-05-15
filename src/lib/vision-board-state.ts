export const STORAGE_KEY = "cafe-hr-vision";
export const VISION_EVENT = "cafe-hr:vision-changed";

export type VisionMood = "warm" | "cool" | "earth" | "sunset" | "mono";
export type VisionItemType = "image" | "text";

export type VisionItem = {
  id: string;
  type: VisionItemType;
  content: string;
  caption: string;
  mood: VisionMood;
  createdAt: string;
};

export const MOOD_LABEL: Record<VisionMood, string> = {
  warm: "Ấm áp",
  cool: "Mát lạnh",
  earth: "Mộc mạc",
  sunset: "Hoàng hôn",
  mono: "Trung tính",
};

// Tailwind utility classes for tinting (border + ring + bg gradient base).
export const MOOD_TINT: Record<VisionMood, string> = {
  warm: "from-rose-200/70 to-amber-100/60 border-rose-300/60 dark:from-rose-500/20 dark:to-amber-500/10 dark:border-rose-400/30",
  cool: "from-sky-200/70 to-indigo-100/60 border-sky-300/60 dark:from-sky-500/20 dark:to-indigo-500/10 dark:border-sky-400/30",
  earth:
    "from-amber-200/70 to-stone-100/60 border-amber-300/60 dark:from-amber-600/20 dark:to-stone-500/10 dark:border-amber-500/30",
  sunset:
    "from-orange-200/70 to-pink-100/60 border-orange-300/60 dark:from-orange-500/20 dark:to-pink-500/10 dark:border-orange-400/30",
  mono: "from-slate-200/70 to-zinc-100/60 border-slate-300/60 dark:from-slate-500/20 dark:to-zinc-500/10 dark:border-slate-400/30",
};

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isVisionMood(v: unknown): v is VisionMood {
  return (
    v === "warm" ||
    v === "cool" ||
    v === "earth" ||
    v === "sunset" ||
    v === "mono"
  );
}

function isVisionItemType(v: unknown): v is VisionItemType {
  return v === "image" || v === "text";
}

function parseItems(raw: string | null): VisionItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: VisionItem[] = [];
    for (const v of parsed) {
      if (!v || typeof v !== "object") continue;
      const e = v as Record<string, unknown>;
      const id = e.id;
      const type = e.type;
      const content = e.content;
      const caption = e.caption;
      const mood = e.mood;
      const createdAt = e.createdAt;
      if (
        typeof id === "string" &&
        isVisionItemType(type) &&
        typeof content === "string" &&
        isVisionMood(mood) &&
        typeof createdAt === "string"
      ) {
        out.push({
          id,
          type,
          content,
          caption: typeof caption === "string" ? caption : "",
          mood,
          createdAt,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function getItems(): VisionItem[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return parseItems(storage.getItem(STORAGE_KEY));
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
      new CustomEvent(VISION_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeItems(next: VisionItem[]): void {
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
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addItem(
  input: Omit<VisionItem, "id" | "createdAt">,
): VisionItem {
  const item: VisionItem = {
    id: newId(),
    type: input.type,
    content: input.content,
    caption: input.caption,
    mood: input.mood,
    createdAt: new Date().toISOString(),
  };
  const all = getItems();
  all.push(item);
  writeItems(all);
  return item;
}

export function updateItem(id: string, patch: Partial<VisionItem>): void {
  if (!id) return;
  const all = getItems();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const current = all[idx];
  const next: VisionItem = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
  };
  all[idx] = next;
  writeItems(all);
}

export function removeItem(id: string): void {
  if (!id) return;
  const all = getItems();
  const next = all.filter((i) => i.id !== id);
  if (next.length === all.length) return;
  writeItems(next);
}
