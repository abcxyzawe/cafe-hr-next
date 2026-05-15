"use server";

import { getSession } from "@/lib/auth";
import { generateKudosSuggestions } from "@/lib/xai";

export async function suggestKudosMessagesAction(
  employeeName: string,
  role: string,
  emoji: string,
): Promise<{ ok: true; messages: string[] } | { ok: false; error: string }> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  const name = (employeeName ?? "").trim();
  const r = (role ?? "").trim();
  const e = (emoji ?? "").trim();
  if (!name) return { ok: false, error: "Thiếu tên nhân viên" };
  if (!e) return { ok: false, error: "Hãy chọn biểu tượng trước" };

  try {
    const messages = await generateKudosSuggestions({
      employeeName: name,
      role: r || "nhân viên quán cà phê",
      emoji: e,
    });
    if (messages.length === 0) {
      return { ok: false, error: "Không nhận được gợi ý nào" };
    }
    return { ok: true, messages };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Không tạo được gợi ý";
    return { ok: false, error: msg };
  }
}
