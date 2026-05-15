"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { SHIFT_LABELS } from "@/lib/utils";
import {
  readCoverMetadata,
  type CoverRequestMetadata,
} from "@/lib/cover-metadata";

export type CoverActionResult = { ok: true } | { ok: false; error: string };

function revalidateAll(): void {
  revalidatePath("/me");
  revalidatePath("/shifts");
  revalidatePath("/");
}

function formatVnDate(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export async function requestCover(
  shiftId: number,
): Promise<CoverActionResult> {
  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    return { ok: false, error: "ID ca không hợp lệ" };
  }
  const session = await getSession();
  if (!session) return { ok: false, error: "Bạn chưa đăng nhập" };

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { employee: { select: { id: true, name: true, email: true } } },
  });
  if (!shift) return { ok: false, error: "Không tìm thấy ca" };

  const isOwner =
    shift.employee.email != null && shift.employee.email === session.email;
  const isAdmin = session.role === "admin";
  if (!isOwner && !isAdmin) {
    return { ok: false, error: "Bạn chỉ có thể đăng tin tìm người thay cho ca của mình" };
  }

  const metadata: CoverRequestMetadata = {
    requestedById: session.uid,
    requestedAt: new Date().toISOString(),
    originalEmployeeId: shift.employee.id,
    originalEmployeeName: shift.employee.name,
  };

  const dateLabel = formatVnDate(shift.shiftDate);
  const shiftLabel = shift.shiftType
    ? (SHIFT_LABELS[shift.shiftType] ?? shift.shiftType)
    : "Ca";

  await logActivity({
    action: "shift.cover_request",
    entityType: "shift",
    entityId: shiftId,
    summary: `${shift.employee.name} cần người thay ca ${shiftLabel} ngày ${dateLabel}`,
    metadata: metadata as unknown as Record<string, unknown>,
  });

  revalidateAll();
  return { ok: true };
}

export async function claimCover(
  shiftId: number,
): Promise<CoverActionResult> {
  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    return { ok: false, error: "ID ca không hợp lệ" };
  }
  const session = await getSession();
  if (!session) return { ok: false, error: "Bạn chưa đăng nhập" };

  const claimer = await prisma.employee.findFirst({
    where: { email: session.email },
    select: { id: true, name: true },
  });
  if (!claimer) {
    return {
      ok: false,
      error: "Tài khoản của bạn chưa liên kết với hồ sơ nhân viên",
    };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentLogs = await prisma.activityLog.findMany({
    where: {
      action: "shift.cover_request",
      entityType: "shift",
      entityId: shiftId,
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const latest = recentLogs[0];
  if (!latest) {
    return { ok: false, error: "Không có yêu cầu tìm người thay nào đang mở" };
  }
  const meta = readCoverMetadata(latest.metadata);
  if (!meta) {
    return { ok: false, error: "Yêu cầu không hợp lệ" };
  }
  if (meta.cancelled || meta.claimed) {
    return { ok: false, error: "Yêu cầu này đã đóng" };
  }
  if (meta.originalEmployeeId === claimer.id) {
    return { ok: false, error: "Bạn không thể nhận chính ca của mình" };
  }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      employeeId: true,
      shiftDate: true,
      shiftType: true,
    },
  });
  if (!shift) return { ok: false, error: "Không tìm thấy ca" };
  if (shift.employeeId !== meta.originalEmployeeId) {
    return {
      ok: false,
      error: "Ca này đã được phân lại cho người khác — yêu cầu không còn hiệu lực",
    };
  }

  // Prevent same-day duplicate (claimer already has a shift on that date+type)
  if (shift.shiftType) {
    const dayStart = new Date(shift.shiftDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dup = await prisma.shift.findFirst({
      where: {
        employeeId: claimer.id,
        shiftDate: { gte: dayStart, lt: dayEnd },
        shiftType: shift.shiftType,
        id: { not: shift.id },
      },
    });
    if (dup) {
      return {
        ok: false,
        error: "Bạn đã có ca cùng loại trong ngày này",
      };
    }
  }

  const claimedAtIso = new Date().toISOString();
  const updatedMeta: CoverRequestMetadata = {
    ...meta,
    cancelled: true,
    claimed: true,
    claimedById: claimer.id,
    claimedByName: claimer.name,
    claimedAt: claimedAtIso,
  };

  await prisma.$transaction([
    prisma.shift.update({
      where: { id: shiftId },
      data: { employeeId: claimer.id },
    }),
    prisma.activityLog.update({
      where: { id: latest.id },
      data: {
        metadata: updatedMeta as unknown as Prisma.InputJsonValue,
      },
    }),
  ]);

  const dateLabel = formatVnDate(shift.shiftDate);
  const shiftLabel = shift.shiftType
    ? (SHIFT_LABELS[shift.shiftType] ?? shift.shiftType)
    : "Ca";

  await logActivity({
    action: "shift.cover_claim",
    entityType: "shift",
    entityId: shiftId,
    summary: `${claimer.name} nhận ca thay ${meta.originalEmployeeName} (${shiftLabel} ngày ${dateLabel})`,
    metadata: {
      shiftId,
      claimerId: claimer.id,
      claimerName: claimer.name,
      originalEmployeeId: meta.originalEmployeeId,
      originalEmployeeName: meta.originalEmployeeName,
      claimedAt: claimedAtIso,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function cancelCoverRequest(
  shiftId: number,
): Promise<CoverActionResult> {
  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    return { ok: false, error: "ID ca không hợp lệ" };
  }
  const session = await getSession();
  if (!session) return { ok: false, error: "Bạn chưa đăng nhập" };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const latest = await prisma.activityLog.findFirst({
    where: {
      action: "shift.cover_request",
      entityType: "shift",
      entityId: shiftId,
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) {
    return { ok: false, error: "Không tìm thấy yêu cầu" };
  }
  const meta = readCoverMetadata(latest.metadata);
  if (!meta) return { ok: false, error: "Yêu cầu không hợp lệ" };
  if (meta.cancelled || meta.claimed) {
    return { ok: false, error: "Yêu cầu này đã đóng" };
  }

  const isAdmin = session.role === "admin";
  const isRequestor = meta.requestedById === session.uid;
  if (!isAdmin && !isRequestor) {
    return { ok: false, error: "Bạn không có quyền huỷ yêu cầu này" };
  }

  const cancelledAtIso = new Date().toISOString();
  const updatedMeta: CoverRequestMetadata = {
    ...meta,
    cancelled: true,
    cancelledAt: cancelledAtIso,
    cancelledBy: session.uid,
  };
  await prisma.activityLog.update({
    where: { id: latest.id },
    data: { metadata: updatedMeta as unknown as Prisma.InputJsonValue },
  });

  await logActivity({
    action: "shift.cover_cancel",
    entityType: "shift",
    entityId: shiftId,
    summary: `Huỷ yêu cầu tìm người thay ca #${shiftId}`,
    metadata: {
      shiftId,
      cancelledBy: session.uid,
      cancelledAt: cancelledAtIso,
    },
  });

  revalidateAll();
  return { ok: true };
}
