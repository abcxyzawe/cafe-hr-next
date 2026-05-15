"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { regenerateTodayInsights, type Insight } from "@/lib/insights";
import { logActivity } from "@/lib/activity";

export async function refreshInsights(): Promise<{
  ok: boolean;
  insights?: Insight[];
  error?: string;
}> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  try {
    const insights = await regenerateTodayInsights();
    await logActivity({
      action: "insights.refresh",
      summary: `${sess.name} đã làm mới phân tích nhanh`,
    });
    revalidatePath("/");
    return { ok: true, insights };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}
