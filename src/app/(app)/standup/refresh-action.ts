"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  gatherStandupFacts,
  setCachedStandup,
} from "@/lib/standup-data";
import { generateStandup } from "@/lib/xai";

export async function refreshStandupAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  try {
    const today = new Date();
    const facts = await gatherStandupFacts(today);
    const { content } = await generateStandup(facts);
    setCachedStandup(today, {
      generatedAt: new Date(),
      facts,
      content,
    });
    revalidatePath("/standup");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không tạo được briefing",
    };
  }
}
