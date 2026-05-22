"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  suggestWeekSchedule,
  type SuggestedShift,
} from "@/lib/schedule-suggest";

const SHIFT_DEFAULT_TIMES: Record<string, [string, string]> = {
  morning: ["07:00", "12:00"],
  afternoon: ["12:00", "17:00"],
  evening: ["17:00", "22:00"],
};

export async function fetchSuggestions(
  weekStartIso: string,
  extraContext?: string,
): Promise<{
  ok: boolean;
  suggestions?: SuggestedShift[];
  source?: "grok" | "fallback";
  error?: string;
}> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  try {
    const result = await suggestWeekSchedule(weekStartIso, extraContext);
    return {
      ok: true,
      suggestions: result.suggestions,
      source: result.source,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không tạo được đề xuất",
    };
  }
}

export async function applySuggestions(
  suggestions: SuggestedShift[],
): Promise<{ ok: boolean; created: number; skipped: number; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, created: 0, skipped: 0, error: "Chỉ admin được phép" };
  }
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return {
      ok: false,
      created: 0,
      skipped: 0,
      error: "Không có ca nào để áp dụng",
    };
  }
  if (suggestions.length > 100) {
    return {
      ok: false,
      created: 0,
      skipped: 0,
      error: "Tối đa 100 ca/lần",
    };
  }

  try {
    // Skip duplicates: (employeeId + date + shiftType) already existing
    const dates = suggestions.map((s) => new Date(s.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    maxDate.setDate(maxDate.getDate() + 1);

    const existing = await prisma.shift.findMany({
      where: {
        shiftDate: { gte: minDate, lt: maxDate },
      },
      select: { employeeId: true, shiftDate: true, shiftType: true },
    });
    const existingSet = new Set(
      existing.map(
        (s) =>
          `${s.employeeId}__${s.shiftDate.toISOString().slice(0, 10)}__${s.shiftType ?? ""}`,
      ),
    );

    const toCreate = suggestions
      .filter(
        (s) =>
          !existingSet.has(`${s.employeeId}__${s.date}__${s.shiftType}`),
      )
      .map((s) => {
        const [start, end] = SHIFT_DEFAULT_TIMES[s.shiftType];
        return {
          employeeId: s.employeeId,
          shiftDate: new Date(s.date),
          shiftType: s.shiftType,
          startTime: start,
          endTime: end,
        };
      });
    const skipped = suggestions.length - toCreate.length;

    if (toCreate.length === 0) {
      return {
        ok: false,
        created: 0,
        skipped,
        error: "Tất cả ca đề xuất đã tồn tại — không có gì để thêm",
      };
    }

    await prisma.shift.createMany({ data: toCreate });
    await logActivity({
      action: "shift.bulk_suggest_apply",
      entityType: "shift",
      summary: `Áp dụng đề xuất lịch: ${toCreate.length} ca tạo mới${skipped > 0 ? `, ${skipped} bỏ qua do trùng` : ""}`,
      metadata: { created: toCreate.length, skipped },
    });
    revalidatePath("/shifts");
    revalidatePath("/");
    return { ok: true, created: toCreate.length, skipped };
  } catch (e) {
    return {
      ok: false,
      created: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : "Lỗi",
    };
  }
}
