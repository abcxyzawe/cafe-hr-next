"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export type AnomalyActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<
  { ok: true; uid: number } | { ok: false; error: string }
> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Vui lòng đăng nhập" };
  if (sess.role !== "admin") return { ok: false, error: "Chỉ admin được phép" };
  return { ok: true, uid: sess.uid };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mark an employee as no-show for a single day by creating an approved
 * unpaid leave entry. Triggered from the AnomalyInsightsWidget.
 */
export async function markAsNoShow(
  employeeId: number,
  dateIso: string,
): Promise<AnomalyActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return { ok: false, error: "ID nhân viên không hợp lệ" };
  }
  if (!DATE_RE.test(dateIso)) {
    return { ok: false, error: "Ngày không hợp lệ (YYYY-MM-DD)" };
  }

  try {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    });
    if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

    const day = new Date(dateIso);
    const now = new Date();
    const req = await prisma.leaveRequest.create({
      data: {
        employeeId,
        type: "unpaid",
        startDate: day,
        endDate: day,
        status: "approved",
        reason: "Tự động ghi nhận từ Anomaly: no-show",
        decidedAt: now,
        decidedById: auth.uid,
      },
    });

    await logActivity({
      action: "leave.create",
      entityType: "leave",
      entityId: req.id,
      summary: `Đánh dấu nghỉ không lương cho ${emp.name} ngày ${dateIso} (từ Anomaly)`,
    });

    revalidatePath("/");
    revalidatePath("/leave");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}

/**
 * Close an open attendance row by setting checkOut=now and computing
 * hoursWorked. Triggered from the AnomalyInsightsWidget.
 */
export async function closeOpenAttendance(
  attendanceId: number,
): Promise<AnomalyActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!Number.isInteger(attendanceId) || attendanceId <= 0) {
    return { ok: false, error: "ID chấm công không hợp lệ" };
  }

  try {
    const att = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        employee: { select: { id: true, name: true } },
      },
    });
    if (!att) return { ok: false, error: "Không tìm thấy bản ghi chấm công" };
    if (att.checkOut) return { ok: false, error: "Ca này đã được đóng" };

    const now = new Date();
    const hours = (now.getTime() - att.checkIn.getTime()) / 3_600_000;
    const hoursWorked = Number(hours.toFixed(2));

    await prisma.attendance.update({
      where: { id: att.id },
      data: { checkOut: now, hoursWorked },
    });

    await logActivity({
      action: "attendance.checkout",
      entityType: "attendance",
      entityId: att.id,
      summary: `Admin đóng ca cho ${att.employee.name} (${hoursWorked}h)`,
    });

    revalidatePath("/");
    revalidatePath("/attendance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi" };
  }
}
