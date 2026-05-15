"use server";

import { getSession } from "@/lib/auth";
import { SOPS } from "@/lib/sop-catalogue";
import { RECIPES } from "@/lib/recipe-catalogue";
import { generateQuiz, type QuizQuestion } from "@/lib/xai";

export type QuizTopic = "sop" | "recipes" | "mixed";

export type QuizActionResult =
  | { ok: true; questions: QuizQuestion[] }
  | { ok: false; error: string };

const STEP_TRUNC = 140;
const TIP_TRUNC = 120;

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function buildSopContext(): string {
  return SOPS.map((sop) => {
    const steps = sop.steps
      .map((st, i) => `  ${i + 1}. ${truncate(st.text, STEP_TRUNC)}`)
      .join("\n");
    const tips =
      sop.tips && sop.tips.length > 0
        ? `\n  Mẹo: ${sop.tips.map((t) => truncate(t, TIP_TRUNC)).join(" | ")}`
        : "";
    return `SOP: ${sop.title}\nMô tả: ${truncate(sop.description, 200)}\nCác bước:\n${steps}${tips}`;
  }).join("\n\n");
}

function buildRecipeContext(): string {
  return RECIPES.map((r) => {
    const steps = r.steps
      .map((st, i) => `  ${i + 1}. ${truncate(st, STEP_TRUNC)}`)
      .join("\n");
    return `Công thức: ${r.name} (tỉ lệ ${r.ratio}, ~${r.brewTimeSeconds}s)\nDụng cụ: ${r.equipment.join(", ")}\nCác bước:\n${steps}`;
  }).join("\n\n");
}

function buildContext(topic: QuizTopic): string {
  if (topic === "sop") return buildSopContext();
  if (topic === "recipes") return buildRecipeContext();
  return `${buildSopContext()}\n\n---\n\n${buildRecipeContext()}`;
}

export async function generateQuizAction(
  topic: QuizTopic,
): Promise<QuizActionResult> {
  const sess = await getSession();
  if (!sess) {
    return { ok: false, error: "Bạn cần đăng nhập để làm bài kiểm tra." };
  }

  if (topic !== "sop" && topic !== "recipes" && topic !== "mixed") {
    return { ok: false, error: "Chủ đề không hợp lệ." };
  }

  try {
    const context = buildContext(topic);
    const { questions } = await generateQuiz({ topic, context });
    return { ok: true, questions };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tạo được bài kiểm tra.";
    return { ok: false, error: message };
  }
}
