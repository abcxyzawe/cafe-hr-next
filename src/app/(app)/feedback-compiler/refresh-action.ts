"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { compileFeedbackReport } from "@/lib/xai";
import {
  gatherFeedbackFacts,
  setCachedReport,
} from "@/lib/feedback-compiler-data";

function dayKey(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function refreshFeedbackReportAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ quản trị viên mới có quyền tổng hợp." };
  }

  try {
    const facts = await gatherFeedbackFacts();
    const report = await compileFeedbackReport(facts);
    setCachedReport(dayKey(new Date()), {
      generatedAt: new Date(),
      facts,
      themes: report.themes,
      positives: report.positives,
      concerns: report.concerns,
    });
    revalidatePath("/feedback-compiler");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
