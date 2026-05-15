"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  gatherFacts,
  setCachedBriefing,
} from "@/lib/daily-briefing";
import { generateBriefing } from "@/lib/xai";

export async function refreshBriefingAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  try {
    const facts = await gatherFacts();
    const { content, model } = await generateBriefing(facts);
    setCachedBriefing(new Date(), {
      content,
      model,
      generatedAt: new Date(),
      facts,
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không tạo được tóm tắt",
    };
  }
}
