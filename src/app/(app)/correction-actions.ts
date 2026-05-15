"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

async function requireAdmin() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") throw new Error("Chỉ admin được phép");
  return sess;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

function combineDateTime(date: string, time: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = TIME_RE.exec(time);
  if (!dm || !tm) return null;
  const year = Number(dm[1]);
  const month = Number(dm[2]) - 1;
  const day = Number(dm[3]);
  const hour = Number(tm[1]);
  const minute = Number(tm[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return new Date(year, month, day, hour, minute, 0, 0);
}

function dayBounds(date: string): { start: Date; end: Date } | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dm) return null;
  const year = Number(dm[1]);
  const month = Number(dm[2]) - 1;
  const day = Number(dm[3]);
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day + 1, 0, 0, 0, 0);
  return { start, end };
}

function computeHours(checkIn: Date, checkOut: Date | null): number | null {
  if (!checkOut) return null;
  const ms = checkOut.getTime() - checkIn.getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / 3_600_000) * 100) / 100;
}

export type CorrectionResult = { ok: true };

export async function approveCorrection(logId: number): Promise<CorrectionResult> {
  const sess = await requireAdmin();

  const log = await prisma.activityLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error("Không tìm thấy yêu cầu");
  if (log.action !== "attendance.correction_request") {
    throw new Error("Mục này không phải yêu cầu sửa chấm công");
  }
  const meta = log.metadata;
  if (!isRecord(meta)) throw new Error("Yêu cầu thiếu dữ liệu");
  if (meta.status !== "pending") throw new Error("Yêu cầu này đã được xử lý");

  const employeeId = asNumber(meta.employeeId);
  const employeeName = asString(meta.employeeName) ?? "nhân viên";
  const date = asString(meta.date);
  const desiredCheckIn = asString(meta.desiredCheckIn);
  const desiredCheckOut = asString(meta.desiredCheckOut);

  if (employeeId === null || !date) {
    throw new Error("Yêu cầu thiếu thông tin nhân viên hoặc ngày");
  }

  const bounds = dayBounds(date);
  if (!bounds) throw new Error("Ngày không hợp lệ");

  const newCheckIn = desiredCheckIn ? combineDateTime(date, desiredCheckIn) : null;
  const newCheckOut = desiredCheckOut ? combineDateTime(date, desiredCheckOut) : null;
  if (desiredCheckIn && !newCheckIn) throw new Error("Giờ check-in không hợp lệ");
  if (desiredCheckOut && !newCheckOut) throw new Error("Giờ check-out không hợp lệ");

  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId,
      checkIn: { gte: bounds.start, lt: bounds.end },
    },
    orderBy: { checkIn: "asc" },
  });

  if (existing) {
    const finalCheckIn = newCheckIn ?? existing.checkIn;
    const finalCheckOut = newCheckOut ?? existing.checkOut ?? null;
    const hours = computeHours(finalCheckIn, finalCheckOut);
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        hoursWorked: hours,
      },
    });
  } else if (newCheckIn) {
    const hours = computeHours(newCheckIn, newCheckOut);
    await prisma.attendance.create({
      data: {
        employeeId,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        hoursWorked: hours,
      },
    });
  } else {
    throw new Error(
      "Không có bản ghi chấm công cho ngày này — yêu cầu cần có giờ check-in mong muốn",
    );
  }

  const nextMeta: Record<string, unknown> = {
    ...meta,
    status: "approved",
    resolvedAt: new Date().toISOString(),
    resolvedBy: sess.name,
  };
  await prisma.activityLog.update({
    where: { id: logId },
    data: { metadata: nextMeta as never },
  });

  await logActivity({
    action: "attendance.correction_approve",
    entityType: "employee",
    entityId: employeeId,
    summary: `Duyệt yêu cầu sửa cho ${employeeName} ngày ${date}`,
    metadata: { logId },
  });

  revalidatePath("/me");
  revalidatePath("/attendance");
  revalidatePath("/");
  return { ok: true };
}

export async function rejectCorrection(
  logId: number,
  reason?: string,
): Promise<CorrectionResult> {
  const sess = await requireAdmin();

  const log = await prisma.activityLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error("Không tìm thấy yêu cầu");
  if (log.action !== "attendance.correction_request") {
    throw new Error("Mục này không phải yêu cầu sửa chấm công");
  }
  const meta = log.metadata;
  if (!isRecord(meta)) throw new Error("Yêu cầu thiếu dữ liệu");
  if (meta.status !== "pending") throw new Error("Yêu cầu này đã được xử lý");

  const employeeId = asNumber(meta.employeeId);
  const employeeName = asString(meta.employeeName) ?? "nhân viên";

  const trimmedReason = reason?.trim();
  const nextMeta: Record<string, unknown> = {
    ...meta,
    status: "rejected",
    resolvedAt: new Date().toISOString(),
    resolvedBy: sess.name,
    reason: trimmedReason && trimmedReason.length > 0 ? trimmedReason : null,
  };

  await prisma.activityLog.update({
    where: { id: logId },
    data: { metadata: nextMeta as never },
  });

  await logActivity({
    action: "attendance.correction_reject",
    entityType: "employee",
    entityId: employeeId ?? undefined,
    summary: `Từ chối yêu cầu sửa của ${employeeName}`,
    metadata: { logId, reason: trimmedReason ?? null },
  });

  revalidatePath("/");
  return { ok: true };
}
