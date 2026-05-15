"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { generateWeeklyInsights } from "@/lib/xai";
import {
  gatherWeeklyFacts,
  setCachedInsights,
  weekKey,
} from "@/lib/weekly-insights-data";

export async function refreshWeeklyInsightsAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin mới có quyền thực hiện" };
  }

  try {
    const now = new Date();
    const facts = await gatherWeeklyFacts(now);
    const { content } = await generateWeeklyInsights({
      weekRange: facts.weekRange,
      totalHours: facts.totalHours,
      totalShifts: facts.totalShifts,
      attendanceRate: facts.attendanceRate,
      kudosCount: facts.kudosCount,
      leavesProcessed: facts.leavesProcessed,
      topPerformers: facts.topPerformers.map((p) => ({
        name: p.name,
        hours: p.hours,
      })),
    });
    setCachedInsights(weekKey(now), {
      generatedAt: new Date(),
      content,
    });
    revalidatePath("/weekly-insights");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
