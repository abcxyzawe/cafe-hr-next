"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { generateAuditSummary } from "@/lib/xai";
import {
  currentDayKey,
  gatherAuditFacts,
  setCachedSummary,
} from "@/lib/audit-summary-data";

export async function refreshAuditSummaryAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin mới có quyền thực hiện" };
  }

  try {
    const facts = await gatherAuditFacts(7);
    const { content } = await generateAuditSummary(facts);
    setCachedSummary(currentDayKey(), {
      generatedAt: new Date(),
      content,
    });
    revalidatePath("/audit");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
