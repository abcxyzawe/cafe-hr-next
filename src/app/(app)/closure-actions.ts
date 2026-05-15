"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const declareSchema = z.object({
  reason: z.string().min(3).max(200),
  closureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")
    .optional(),
});

export type ClosureResult = { ok: boolean; error?: string };

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function vnDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function declareClosure(input: {
  reason: string;
  closureDate?: string;
}): Promise<ClosureResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  const parsed = declareSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dữ liệu không hợp lệ (lý do 3–200 ký tự)" };
  }
  const date = parsed.data.closureDate ?? todayIsoLocal();
  if (date < todayIsoLocal()) {
    return { ok: false, error: "Không thể đặt nghỉ cho ngày trong quá khứ" };
  }
  const isToday = date === todayIsoLocal();
  try {
    await logActivity({
      action: "closure.declare",
      summary: isToday
        ? `🚪 Quán nghỉ hôm nay: ${parsed.data.reason}`
        : `🚪 Quán nghỉ ngày ${vnDate(date)}: ${parsed.data.reason}`,
      metadata: {
        reason: parsed.data.reason,
        closureDate: date,
        declaredBy: sess.name,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}

/** Backward-compat wrapper for the existing UI. */
export async function declareTodayClosure(input: {
  reason: string;
}): Promise<ClosureResult> {
  return declareClosure({ reason: input.reason });
}

/**
 * Cancel a specific closure declaration by its ActivityLog id.
 * Updates metadata.cancelled=true and writes a `closure.cancel` log entry.
 */
export async function cancelClosure(id: number): Promise<ClosureResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "ID không hợp lệ" };
  }
  try {
    const latest = await prisma.activityLog.findUnique({ where: { id } });
    if (!latest || latest.action !== "closure.declare") {
      return { ok: false, error: "Không tìm thấy thông báo nghỉ" };
    }
    const oldMeta =
      latest.metadata && typeof latest.metadata === "object" && !Array.isArray(latest.metadata)
        ? (latest.metadata as Record<string, unknown>)
        : {};
    await prisma.activityLog.update({
      where: { id: latest.id },
      data: {
        metadata: {
          ...oldMeta,
          cancelled: true,
          cancelledAt: new Date().toISOString(),
          cancelledBy: sess.name,
        },
      },
    });
    await logActivity({
      action: "closure.cancel",
      summary: `${sess.name} huỷ thông báo quán nghỉ #${id}`,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}

/** Backward-compat: cancel today's closure (finds it then forwards to cancelClosure). */
export async function cancelTodayClosure(): Promise<ClosureResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const latest = await prisma.activityLog.findFirst({
    where: {
      action: "closure.declare",
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
    orderBy: { id: "desc" },
  });
  if (!latest) return { ok: false, error: "Không có thông báo nghỉ nào hôm nay" };
  return cancelClosure(latest.id);
}
