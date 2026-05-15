export const STORAGE_KEY = "cafe-hr-self-assessment";
export const ASSESSMENT_EVENT = "cafe-hr:self-assessment-changed";

const HISTORY_CAP = 50;

export type AssessmentResult = {
  id: string;
  takenAt: string; // ISO
  overallScore: number; // 0-100
  questions: string[];
  answers: number[]; // 1-5 each
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isNumberArray(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) => typeof x === "number" && Number.isFinite(x) && x >= 1 && x <= 5,
    )
  );
}

function isAssessmentResult(v: unknown): v is AssessmentResult {
  if (!v || typeof v !== "object") return false;
  const rec = v as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.takenAt === "string" &&
    typeof rec.overallScore === "number" &&
    Number.isFinite(rec.overallScore) &&
    isStringArray(rec.questions) &&
    isNumberArray(rec.answers) &&
    (rec.questions as string[]).length === (rec.answers as number[]).length
  );
}

export function getHistory(): AssessmentResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAssessmentResult);
  } catch {
    return [];
  }
}

function writeHistory(list: AssessmentResult[]): void {
  if (typeof window === "undefined") return;
  const capped = list.slice(0, HISTORY_CAP);
  const json = JSON.stringify(capped);
  window.localStorage.setItem(STORAGE_KEY, json);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: json,
    }),
  );
  window.dispatchEvent(new Event(ASSESSMENT_EVENT));
}

function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `sa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveResult(
  input: Omit<AssessmentResult, "id" | "takenAt">,
): AssessmentResult {
  const list = getHistory();
  const entry: AssessmentResult = {
    id: makeId(),
    takenAt: new Date().toISOString(),
    overallScore: input.overallScore,
    questions: [...input.questions],
    answers: [...input.answers],
  };
  writeHistory([entry, ...list]);
  return entry;
}

export function deleteResult(id: string): void {
  const list = getHistory();
  const next = list.filter((item) => item.id !== id);
  if (next.length === list.length) return;
  writeHistory(next);
}
