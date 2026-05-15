"use server";

import { getSession } from "@/lib/auth";
import { generateSelfAssessmentQuestions } from "@/lib/xai";

const ROLE_LABELS: Record<string, string> = {
  barista: "barista (pha chế)",
  server: "phục vụ bàn",
  cashier: "thu ngân",
  manager: "quản lý ca",
};

export type GenerateAssessmentResult =
  | { ok: true; questions: string[] }
  | { ok: false; error: string };

export async function generateAssessmentAction(
  role: string,
): Promise<GenerateAssessmentResult> {
  const sess = await getSession();
  if (!sess) {
    return {
      ok: false,
      error: "Bạn cần đăng nhập để làm bài tự đánh giá.",
    };
  }

  if (typeof role !== "string" || !(role in ROLE_LABELS)) {
    return { ok: false, error: "Vai trò không hợp lệ." };
  }

  try {
    const { questions } = await generateSelfAssessmentQuestions(
      ROLE_LABELS[role],
    );
    return { ok: true, questions };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tạo được bộ câu hỏi.";
    return { ok: false, error: message };
  }
}
