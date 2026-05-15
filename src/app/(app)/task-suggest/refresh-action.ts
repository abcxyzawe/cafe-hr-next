"use server";

import { getSession } from "@/lib/auth";
import {
  gatherSuggesterFacts,
  type SuggesterFacts,
} from "@/lib/task-suggest-data";
import { generateTaskSuggestions, type TaskSuggestion } from "@/lib/xai";

export type RefreshTaskSuggestionsResult =
  | { ok: true; suggestions: TaskSuggestion[]; facts: SuggesterFacts }
  | { ok: false; error: string };

export async function refreshTaskSuggestionsAction(): Promise<RefreshTaskSuggestionsResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  try {
    const facts = await gatherSuggesterFacts();
    const { suggestions } = await generateTaskSuggestions(facts);
    return { ok: true, suggestions, facts };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không tạo được gợi ý task",
    };
  }
}
