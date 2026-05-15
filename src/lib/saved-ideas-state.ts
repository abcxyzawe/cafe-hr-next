export const STORAGE_KEY = "cafe-hr-saved-ideas";
export const SAVED_IDEAS_EVENT = "cafe-hr:saved-ideas-changed";

export type SavedIdea = {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  estimatedCostVnd: number;
  savedAt: string;
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isSavedIdea(v: unknown): v is SavedIdea {
  if (!v || typeof v !== "object") return false;
  const rec = v as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.name === "string" &&
    typeof rec.description === "string" &&
    isStringArray(rec.ingredients) &&
    typeof rec.estimatedCostVnd === "number" &&
    Number.isFinite(rec.estimatedCostVnd) &&
    typeof rec.savedAt === "string"
  );
}

export function getSavedIdeas(): SavedIdea[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedIdea);
  } catch {
    return [];
  }
}

function writeSavedIdeas(list: SavedIdea[]): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(list);
  window.localStorage.setItem(STORAGE_KEY, json);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: json,
    }),
  );
  window.dispatchEvent(new Event(SAVED_IDEAS_EVENT));
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveIdea(
  input: Omit<SavedIdea, "id" | "savedAt">,
): SavedIdea {
  const list = getSavedIdeas();
  const entry: SavedIdea = {
    id: makeId(),
    name: input.name,
    description: input.description,
    ingredients: [...input.ingredients],
    estimatedCostVnd: input.estimatedCostVnd,
    savedAt: new Date().toISOString(),
  };
  writeSavedIdeas([entry, ...list]);
  return entry;
}

export function removeSavedIdea(id: string): void {
  const list = getSavedIdeas();
  const next = list.filter((item) => item.id !== id);
  if (next.length === list.length) return;
  writeSavedIdeas(next);
}
