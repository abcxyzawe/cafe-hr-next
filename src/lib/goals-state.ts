export const STORAGE_KEY = "cafe-hr-goals";
export const GOALS_EVENT = "cafe-hr:goals-changed";

export type GoalType = "hours" | "shifts" | "income" | "skill" | "custom";

export type Goal = {
  id: string;
  title: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  notes: string;
  completed: boolean;
  createdAt: string;
};

export const TYPE_LABEL: Record<GoalType, string> = {
  hours: "Giờ làm",
  shifts: "Số ca",
  income: "Thu nhập",
  skill: "Kỹ năng",
  custom: "Tuỳ chỉnh",
};

export const TYPE_ICON: Record<
  GoalType,
  "clock" | "calendar-clock" | "wallet" | "sparkles" | "target"
> = {
  hours: "clock",
  shifts: "calendar-clock",
  income: "wallet",
  skill: "sparkles",
  custom: "target",
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isGoalType(v: unknown): v is GoalType {
  return (
    v === "hours" ||
    v === "shifts" ||
    v === "income" ||
    v === "skill" ||
    v === "custom"
  );
}

function parseGoals(raw: string | null): Goal[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Goal[] = [];
    for (const v of parsed) {
      if (!v || typeof v !== "object") continue;
      const e = v as Record<string, unknown>;
      const id = e.id;
      const title = e.title;
      const type = e.type;
      const targetValue = e.targetValue;
      const currentValue = e.currentValue;
      const unit = e.unit;
      const deadline = e.deadline;
      const notes = e.notes;
      const completed = e.completed;
      const createdAt = e.createdAt;
      if (
        typeof id === "string" &&
        typeof title === "string" &&
        isGoalType(type) &&
        typeof targetValue === "number" &&
        Number.isFinite(targetValue) &&
        typeof currentValue === "number" &&
        Number.isFinite(currentValue) &&
        typeof unit === "string" &&
        typeof deadline === "string" &&
        ISO_DATE_RE.test(deadline) &&
        typeof createdAt === "string"
      ) {
        out.push({
          id,
          title,
          type,
          targetValue,
          currentValue,
          unit,
          deadline,
          notes: typeof notes === "string" ? notes : "",
          completed: completed === true,
          createdAt,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function getGoals(): Goal[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return parseGoals(storage.getItem(STORAGE_KEY));
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
      new CustomEvent(GOALS_EVENT, { detail: { key: STORAGE_KEY } }),
    );
  } catch {
    // ignore
  }
}

function writeGoals(next: Goal[]): void {
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
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addGoal(
  input: Omit<Goal, "id" | "currentValue" | "completed" | "createdAt"> & {
    currentValue?: number;
  },
): Goal {
  const goal: Goal = {
    id: newId(),
    title: input.title,
    type: input.type,
    targetValue: input.targetValue,
    currentValue:
      typeof input.currentValue === "number" && Number.isFinite(input.currentValue)
        ? input.currentValue
        : 0,
    unit: input.unit,
    deadline: input.deadline,
    notes: input.notes,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  const all = getGoals();
  all.push(goal);
  writeGoals(all);
  return goal;
}

export function updateGoal(id: string, patch: Partial<Goal>): void {
  if (!id) return;
  const all = getGoals();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const current = all[idx];
  const next: Goal = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
  };
  all[idx] = next;
  writeGoals(all);
}

export function deleteGoal(id: string): void {
  if (!id) return;
  const all = getGoals();
  const next = all.filter((g) => g.id !== id);
  if (next.length === all.length) return;
  writeGoals(next);
}

export function adjustProgress(id: string, delta: number): void {
  if (!id || !Number.isFinite(delta)) return;
  const all = getGoals();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const g = all[idx];
  const nextValue = Math.max(0, g.currentValue + delta);
  const completed = g.targetValue > 0 && nextValue >= g.targetValue;
  all[idx] = {
    ...g,
    currentValue: nextValue,
    completed: completed ? true : g.completed,
  };
  writeGoals(all);
}

export function toggleCompleted(id: string): void {
  if (!id) return;
  const all = getGoals();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const g = all[idx];
  all[idx] = { ...g, completed: !g.completed };
  writeGoals(all);
}
