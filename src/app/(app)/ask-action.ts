"use server";

import { getSession } from "@/lib/auth";
import { askQuestion, type QAChatMessage } from "@/lib/qa";
import { logActivity } from "@/lib/activity";

export async function ask(
  question: string,
  history?: ReadonlyArray<QAChatMessage>,
): Promise<{ ok: boolean; answer?: string; source?: string; error?: string }> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  try {
    // Sanitize history: keep only valid roles + bounded content length
    const safeHistory: QAChatMessage[] = (history ?? [])
      .filter(
        (m): m is QAChatMessage =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
      .slice(-6);

    const { answer, source } = await askQuestion(question, safeHistory);
    // Light activity log (only admin questions, to avoid spam)
    if (sess.role === "admin") {
      await logActivity({
        action: "qa.ask",
        summary: `${sess.name} hỏi: ${question.slice(0, 80)}${question.length > 80 ? "…" : ""}`,
      });
    }
    return { ok: true, answer, source };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
