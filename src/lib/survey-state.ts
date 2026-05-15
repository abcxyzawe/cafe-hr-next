export const STORAGE_PREFIX = "cafe-hr-survey-";
export const SURVEY_INDEX_KEY = "cafe-hr-surveys-index";
export const SURVEY_EVENT = "cafe-hr:survey-changed";

export type QuestionType = "text" | "rating" | "choice";

export type SurveyQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  required: boolean;
  choices?: string[];
};

export type SurveyDefinition = {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  createdAt: string;
};

export type SurveyResponse = {
  id: string;
  surveyId: string;
  answers: Record<string, string | number | string[]>;
  submittedAt: string;
};

export type SurveyData = {
  definition: SurveyDefinition;
  responses: SurveyResponse[];
};

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKeyFor(surveyId: string): string {
  return `${STORAGE_PREFIX}${surveyId}`;
}

function dispatchChange(surveyId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(SURVEY_EVENT, { detail: { surveyId } }),
    );
  } catch {
    // ignore
  }
}

export function shortId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isQuestionType(v: unknown): v is QuestionType {
  return v === "text" || v === "rating" || v === "choice";
}

function parseQuestion(v: unknown): SurveyQuestion | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (!isQuestionType(obj.type)) return null;
  if (typeof obj.prompt !== "string") return null;
  const required = obj.required === true;
  const q: SurveyQuestion = {
    id: obj.id,
    type: obj.type,
    prompt: obj.prompt,
    required,
  };
  if (obj.type === "choice" && isStringArray(obj.choices)) {
    q.choices = obj.choices;
  }
  return q;
}

function parseDefinition(v: unknown): SurveyDefinition | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (typeof obj.title !== "string") return null;
  if (typeof obj.description !== "string") return null;
  if (typeof obj.createdAt !== "string") return null;
  if (!Array.isArray(obj.questions)) return null;
  const questions: SurveyQuestion[] = [];
  for (const raw of obj.questions) {
    const q = parseQuestion(raw);
    if (q) questions.push(q);
  }
  return {
    id: obj.id,
    title: obj.title,
    description: obj.description,
    createdAt: obj.createdAt,
    questions,
  };
}

function parseAnswerValue(v: unknown): string | number | string[] | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (isStringArray(v)) return v;
  return null;
}

function parseResponse(v: unknown): SurveyResponse | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (typeof obj.surveyId !== "string") return null;
  if (typeof obj.submittedAt !== "string") return null;
  if (!obj.answers || typeof obj.answers !== "object") return null;
  const ansRaw = obj.answers as Record<string, unknown>;
  const answers: Record<string, string | number | string[]> = {};
  for (const key of Object.keys(ansRaw)) {
    const parsed = parseAnswerValue(ansRaw[key]);
    if (parsed !== null) answers[key] = parsed;
  }
  return {
    id: obj.id,
    surveyId: obj.surveyId,
    submittedAt: obj.submittedAt,
    answers,
  };
}

function parseData(raw: string): SurveyData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const def = parseDefinition(obj.definition);
    if (!def) return null;
    const responsesRaw = obj.responses;
    const responses: SurveyResponse[] = [];
    if (Array.isArray(responsesRaw)) {
      for (const r of responsesRaw) {
        const parsedR = parseResponse(r);
        if (parsedR) responses.push(parsedR);
      }
    }
    return { definition: def, responses };
  } catch {
    return null;
  }
}

function readIndex(storage: Storage): string[] {
  try {
    const raw = storage.getItem(SURVEY_INDEX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isStringArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeIndex(storage: Storage, ids: string[]): void {
  try {
    storage.setItem(SURVEY_INDEX_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota
  }
}

export function listSurveys(): SurveyDefinition[] {
  const storage = safeStorage();
  if (!storage) return [];
  const ids = readIndex(storage);
  const out: SurveyDefinition[] = [];
  for (const id of ids) {
    const data = getSurveyData(id);
    if (data) out.push(data.definition);
  }
  return out;
}

export function getSurveyData(surveyId: string): SurveyData | null {
  const storage = safeStorage();
  if (!storage) return null;
  const raw = storage.getItem(storageKeyFor(surveyId));
  if (!raw) return null;
  return parseData(raw);
}

export function saveSurveyDefinition(def: SurveyDefinition): void {
  const storage = safeStorage();
  if (!storage) return;
  const existing = getSurveyData(def.id);
  const data: SurveyData = {
    definition: def,
    responses: existing?.responses ?? [],
  };
  try {
    storage.setItem(storageKeyFor(def.id), JSON.stringify(data));
  } catch {
    return;
  }
  const idx = readIndex(storage);
  if (!idx.includes(def.id)) {
    idx.push(def.id);
    writeIndex(storage, idx);
  }
  dispatchChange(def.id);
}

export function appendResponse(
  surveyId: string,
  response: Omit<SurveyResponse, "id" | "submittedAt" | "surveyId">,
): SurveyResponse | null {
  const storage = safeStorage();
  if (!storage) return null;
  const data = getSurveyData(surveyId);
  if (!data) return null;
  const newResp: SurveyResponse = {
    id: shortId(),
    surveyId,
    submittedAt: new Date().toISOString(),
    answers: response.answers,
  };
  const updated: SurveyData = {
    definition: data.definition,
    responses: [...data.responses, newResp],
  };
  try {
    storage.setItem(storageKeyFor(surveyId), JSON.stringify(updated));
  } catch {
    return null;
  }
  dispatchChange(surveyId);
  return newResp;
}

export function deleteSurvey(surveyId: string): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(storageKeyFor(surveyId));
  } catch {
    // ignore
  }
  const idx = readIndex(storage).filter((id) => id !== surveyId);
  writeIndex(storage, idx);
  dispatchChange(surveyId);
}
