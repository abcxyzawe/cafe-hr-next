"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const ALLOWED_DAYS = [30, 90, 180, 365] as const;
type AllowedDays = (typeof ALLOWED_DAYS)[number];

function isAllowedDays(value: number): value is AllowedDays {
  return (ALLOWED_DAYS as readonly number[]).includes(value);
}

function computeCutoff(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

export type PreviewCleanupResult = {
  ok: boolean;
  count?: number;
  cutoffIso?: string;
  error?: string;
};

export async function previewCleanup(
  olderThanDays: number,
): Promise<PreviewCleanupResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin mới có quyền thực hiện" };
  }

  if (!isAllowedDays(olderThanDays)) {
    return { ok: false, error: "Số ngày không hợp lệ" };
  }

  const cutoff = computeCutoff(olderThanDays);

  try {
    const count = await prisma.activityLog.count({
      where: { createdAt: { lt: cutoff } },
    });
    return { ok: true, count, cutoffIso: cutoff.toISOString() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export type PurgeResult = {
  ok: boolean;
  deleted?: number;
  error?: string;
};

export async function purgeOldActivities(
  olderThanDays: number,
): Promise<PurgeResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin mới có quyền thực hiện" };
  }

  if (!isAllowedDays(olderThanDays)) {
    return { ok: false, error: "Số ngày không hợp lệ" };
  }

  const cutoff = computeCutoff(olderThanDays);

  try {
    const count = await prisma.activityLog.count({
      where: { createdAt: { lt: cutoff } },
    });

    await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    await logActivity({
      action: "audit.cleanup",
      summary: `${sess.name} đã xoá ${count} nhật ký cũ hơn ${olderThanDays} ngày`,
      metadata: {
        olderThanDays,
        cutoffIso: cutoff.toISOString(),
        deleted: count,
      },
    });

    revalidatePath("/audit");
    return { ok: true, deleted: count };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
