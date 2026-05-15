"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";

const SHIFT_DEFAULT_TIMES_MAP: Record<
  "morning" | "afternoon" | "evening",
  [string, string]
> = {
  morning: ["07:00", "12:00"],
  afternoon: ["12:00", "17:00"],
  evening: ["17:00", "22:00"],
};

const entrySchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  shiftType: z.enum(["morning", "afternoon", "evening"]),
});

const templateSchema = z.object({
  entries: z.array(entrySchema),
});

export type ApplyShiftTemplateResult = {
  ok: boolean;
  applied: number;
  skipped: number;
  error?: string;
};

/**
 * Apply a saved shift template to the week starting at targetWeekStartIso (Monday).
 * Skips any entry whose (employeeId, computed shiftDate, shiftType) already exists.
 * Admin only.
 */
export async function applyShiftTemplate(
  template: {
    entries: Array<{
      employeeId: number;
      dayOfWeek: number;
      shiftType: "morning" | "afternoon" | "evening";
    }>;
  },
  targetWeekStartIso: string,
): Promise<ApplyShiftTemplateResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, applied: 0, skipped: 0, error: "Chỉ admin được phép" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetWeekStartIso)) {
    return {
      ok: false,
      applied: 0,
      skipped: 0,
      error: "Ngày tuần không hợp lệ (YYYY-MM-DD)",
    };
  }

  const parsed = templateSchema.safeParse(template);
  if (!parsed.success) {
    return {
      ok: false,
      applied: 0,
      skipped: 0,
      error: "Template không hợp lệ",
    };
  }

  const entries = parsed.data.entries;
  if (entries.length === 0) {
    return {
      ok: false,
      applied: 0,
      skipped: 0,
      error: "Template không có ca nào",
    };
  }

  const weekStart = new Date(targetWeekStartIso);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const toCreate: Array<{
    employeeId: number;
    shiftDate: Date;
    shiftType: "morning" | "afternoon" | "evening";
    startTime: string;
    endTime: string;
  }> = entries.map((e) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + e.dayOfWeek);
    const [start, end] = SHIFT_DEFAULT_TIMES_MAP[e.shiftType];
    return {
      employeeId: e.employeeId,
      shiftDate: d,
      shiftType: e.shiftType,
      startTime: start,
      endTime: end,
    };
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.shift.findMany({
        where: { shiftDate: { gte: weekStart, lt: weekEnd } },
        select: { employeeId: true, shiftDate: true, shiftType: true },
      });
      const existingSet = new Set(
        existing.map(
          (s) =>
            `${s.employeeId}__${s.shiftDate.toISOString().slice(0, 10)}__${s.shiftType ?? ""}`,
        ),
      );
      // Also dedupe within the batch itself
      const batchSet = new Set<string>();
      const finalCreate = toCreate.filter((s) => {
        const k = `${s.employeeId}__${s.shiftDate.toISOString().slice(0, 10)}__${s.shiftType}`;
        if (existingSet.has(k) || batchSet.has(k)) return false;
        batchSet.add(k);
        return true;
      });
      const skipped = toCreate.length - finalCreate.length;
      if (finalCreate.length === 0) {
        return { applied: 0, skipped };
      }
      await tx.shift.createMany({ data: finalCreate });
      return { applied: finalCreate.length, skipped };
    });

    await logActivity({
      action: "shift.template_apply",
      entityType: "shift",
      summary: `Áp dụng template ${result.applied} ca vào tuần ${targetWeekStartIso}`,
      metadata: {
        weekStart: targetWeekStartIso,
        applied: result.applied,
        skipped: result.skipped,
      },
    });

    revalidatePath("/shifts");
    revalidatePath("/");
    return { ok: true, applied: result.applied, skipped: result.skipped };
  } catch (e) {
    return {
      ok: false,
      applied: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
