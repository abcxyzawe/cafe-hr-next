// Recurring task templates persisted to localStorage (admin-only UX).
// Mon=0..Sun=6 (different from JS getDay where Sun=0).

export type Recurrence =
  | { kind: "daily" }
  | { kind: "weekly"; weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { kind: "monthly"; dayOfMonth: number };

export type TaskPriorityValue = "low" | "normal" | "high" | "urgent";

export type TaskTemplate = {
  id: string;
  title: string;
  priority: TaskPriorityValue;
  assigneeId: number | null;
  recurrence: Recurrence;
  createdAt: number;
};

export const STORAGE_KEY = "cafe-hr-task-templates";
export const MAX = 20;

function isPriority(v: unknown): v is TaskPriorityValue {
  return v === "low" || v === "normal" || v === "high" || v === "urgent";
}

function isWeekday(v: unknown): v is 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6;
}

function isRecurrence(v: unknown): v is Recurrence {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.kind === "daily") return true;
  if (o.kind === "weekly") return isWeekday(o.weekday);
  if (o.kind === "monthly") {
    return (
      typeof o.dayOfMonth === "number" &&
      Number.isInteger(o.dayOfMonth) &&
      o.dayOfMonth >= 1 &&
      o.dayOfMonth <= 31
    );
  }
  return false;
}

function isTemplate(v: unknown): v is TaskTemplate {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.title === "string" &&
    o.title.length > 0 &&
    isPriority(o.priority) &&
    (o.assigneeId === null ||
      (typeof o.assigneeId === "number" &&
        Number.isInteger(o.assigneeId) &&
        o.assigneeId > 0)) &&
    isRecurrence(o.recurrence) &&
    typeof o.createdAt === "number"
  );
}

export function loadTaskTemplates(): TaskTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTemplate).slice(0, MAX);
  } catch {
    return [];
  }
}

function writeAll(list: TaskTemplate[]): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(list);
  window.localStorage.setItem(STORAGE_KEY, json);
  // Synthetic StorageEvent so other tabs/components in same tab can react.
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: json,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // Some environments disallow StorageEvent constructor; ignore.
  }
}

export function saveTaskTemplate(t: TaskTemplate): TaskTemplate[] {
  const current = loadTaskTemplates();
  const idx = current.findIndex((x) => x.id === t.id);
  let next: TaskTemplate[];
  if (idx >= 0) {
    next = current.slice();
    next[idx] = t;
  } else {
    next = [t, ...current].slice(0, MAX);
  }
  writeAll(next);
  return next;
}

export function removeTaskTemplate(id: string): TaskTemplate[] {
  const next = loadTaskTemplates().filter((t) => t.id !== id);
  writeAll(next);
  return next;
}

/** Mon=0..Sun=6 conversion from JS getDay (Sun=0..Sat=6). */
function jsDayToMonFirst(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function daysInMonth(year: number, monthZeroBased: number): number {
  // day 0 of next month = last day of this month
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

export function matchesToday(r: Recurrence, now: Date = new Date()): boolean {
  if (r.kind === "daily") return true;
  if (r.kind === "weekly") {
    return jsDayToMonFirst(now.getDay()) === r.weekday;
  }
  // monthly — clamp to last day if dayOfMonth > daysInMonth
  const dim = daysInMonth(now.getFullYear(), now.getMonth());
  const target = r.dayOfMonth > dim ? dim : r.dayOfMonth;
  return now.getDate() === target;
}
