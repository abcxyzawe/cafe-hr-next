"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { regenerateTodayQuote } from "@/lib/daily-quote";
import { logActivity } from "@/lib/activity";

export async function regenerateQuote(): Promise<{
  ok: boolean;
  content?: string;
  error?: string;
}> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  try {
    const { content } = await regenerateTodayQuote();
    await logActivity({
      action: "quote.regenerate",
      summary: `${sess.name} đã đổi câu nói hôm nay`,
    });
    revalidatePath("/");
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không đổi được câu nói" };
  }
}
