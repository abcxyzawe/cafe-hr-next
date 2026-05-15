export const STORAGE_KEY = "cafe-hr-skills";
export const SKILL_EVENT = "cafe-hr:skills-changed";

export type SkillRating = 0 | 1 | 2 | 3;
export type SkillState = Record<string, Record<string, SkillRating>>;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRating(n: unknown): n is SkillRating {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

function parseState(raw: string | null): SkillState {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: SkillState = {};
    for (const [empKey, skillMap] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!skillMap || typeof skillMap !== "object" || Array.isArray(skillMap)) {
        continue;
      }
      const inner: Record<string, SkillRating> = {};
      for (const [skillId, value] of Object.entries(
        skillMap as Record<string, unknown>,
      )) {
        if (isRating(value)) inner[skillId] = value;
      }
      if (Object.keys(inner).length > 0) out[empKey] = inner;
    }
    return out;
  } catch {
    return {};
  }
}

export function getSkillState(): SkillState {
  const storage = safeStorage();
  if (!storage) return {};
  try {
    return parseState(storage.getItem(STORAGE_KEY));
  } catch {
    return {};
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
      new CustomEvent(SKILL_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeState(next: SkillState): void {
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

export function getRating(empId: number, skillId: string): SkillRating {
  const state = getSkillState();
  const empMap = state[String(empId)];
  if (!empMap) return 0;
  const v = empMap[skillId];
  return isRating(v) ? v : 0;
}

export function setRating(
  empId: number,
  skillId: string,
  rating: SkillRating,
): void {
  if (!skillId) return;
  const state = getSkillState();
  const key = String(empId);
  const empMap: Record<string, SkillRating> = { ...(state[key] ?? {}) };
  if (rating === 0) {
    delete empMap[skillId];
  } else {
    empMap[skillId] = rating;
  }
  if (Object.keys(empMap).length === 0) {
    delete state[key];
  } else {
    state[key] = empMap;
  }
  writeState(state);
}

export function resetAllSkills(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  dispatchChange(null);
}
