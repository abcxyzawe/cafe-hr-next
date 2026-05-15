import type { CompetitiveLandscapeResult } from "@/lib/xai";

export type CompetitorInput = {
  name: string;
  notes: string;
};

export type CompetitiveState = {
  ownName: string;
  ownUsp: string;
  competitors: CompetitorInput[];
  result: CompetitiveLandscapeResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const MAX_COMPETITORS = 3;
export const MIN_COMPETITORS = 1;

export const INITIAL_COMPETITIVE_STATE: CompetitiveState = {
  ownName: "",
  ownUsp: "",
  competitors: [{ name: "", notes: "" }],
  result: null,
  error: null,
  generatedAt: null,
};

export function parseCompetitorsFromFormData(
  formData: FormData,
): CompetitorInput[] {
  const names = formData.getAll("competitorName");
  const notes = formData.getAll("competitorNotes");
  const len = Math.max(names.length, notes.length);
  const out: CompetitorInput[] = [];
  for (let i = 0; i < len; i += 1) {
    const name = names[i];
    const note = notes[i];
    out.push({
      name: typeof name === "string" ? name : "",
      notes: typeof note === "string" ? note : "",
    });
  }
  return out;
}
