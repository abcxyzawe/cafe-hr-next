"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Result = { ok: boolean; error?: string };

async function getLinkedEmployee(): Promise<{
  employeeId: number;
  employeeName: string;
} | null> {
  const sess = await getSession();
  if (!sess) return null;
  const emp = await prisma.employee.findFirst({
    where: { email: sess.email },
    select: { id: true, name: true },
  });
  if (!emp) return null;
  return { employeeId: emp.id, employeeName: emp.name };
}

export async function quickCheckin(): Promise<Result> {
  const linked = await getLinkedEmployee();
  if (!linked) return { ok: false, error: "Tài khoản chưa được liên kết với hồ sơ nhân viên" };

  // Refuse if already an open attendance row
  const open = await prisma.attendance.findFirst({
    where: { employeeId: linked.employeeId, checkOut: null },
  });
  if (open) return { ok: false, error: "Bạn đã check-in rồi — hãy check-out trước" };

  try {
    await prisma.attendance.create({
      data: {
        employeeId: linked.employeeId,
        checkIn: new Date(),
      },
    });
    await logActivity({
      action: "attendance.checkin",
      entityType: "employee",
      entityId: linked.employeeId,
      summary: `${linked.employeeName} check-in từ web`,
    });
    revalidatePath("/me");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function quickCheckout(): Promise<Result> {
  const linked = await getLinkedEmployee();
  if (!linked) return { ok: false, error: "Tài khoản chưa được liên kết với hồ sơ nhân viên" };

  const open = await prisma.attendance.findFirst({
    where: { employeeId: linked.employeeId, checkOut: null },
    orderBy: { checkIn: "desc" },
  });
  if (!open) return { ok: false, error: "Không tìm thấy ca đang mở" };

  const now = new Date();
  const ms = now.getTime() - open.checkIn.getTime();
  const hoursWorked = Math.max(0, Math.round((ms / 3_600_000) * 100) / 100);

  try {
    await prisma.attendance.update({
      where: { id: open.id },
      data: { checkOut: now, hoursWorked },
    });
    await logActivity({
      action: "attendance.checkout",
      entityType: "employee",
      entityId: linked.employeeId,
      summary: `${linked.employeeName} check-out từ web (${hoursWorked.toFixed(2)}h)`,
    });
    revalidatePath("/me");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}
