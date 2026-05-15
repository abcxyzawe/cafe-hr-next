"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function checkIn(employeeId: number) {
  const open = await prisma.attendance.findFirst({
    where: { employeeId, checkOut: null },
  });
  if (open) throw new Error("Nhân viên đang trong ca, vui lòng check-out trước");
  await prisma.attendance.create({
    data: { employeeId, checkIn: new Date() },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function checkOut(employeeId: number) {
  const open = await prisma.attendance.findFirst({
    where: { employeeId, checkOut: null },
    orderBy: { id: "desc" },
  });
  if (!open) throw new Error("Không có ca nào đang mở");
  const checkOutAt = new Date();
  const hours = (checkOutAt.getTime() - new Date(open.checkIn).getTime()) / 3600000;
  await prisma.attendance.update({
    where: { id: open.id },
    data: { checkOut: checkOutAt, hoursWorked: Number(hours.toFixed(2)) },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

function sanitizeIds(ids: number[]): number[] {
  return Array.from(
    new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
  );
}

export async function bulkCloseAttendance(
  ids: number[],
): Promise<{ ok: boolean; closed: number; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, closed: 0, error: "Chỉ admin được phép" };
  }
  const validIds = sanitizeIds(ids);
  if (validIds.length === 0) {
    return { ok: false, closed: 0, error: "Không có lượt chấm công nào được chọn" };
  }
  if (validIds.length > 100) {
    return { ok: false, closed: 0, error: "Tối đa 100 lượt mỗi lần" };
  }
  try {
    const rows = await prisma.attendance.findMany({
      where: { id: { in: validIds }, checkOut: null },
      select: { id: true, checkIn: true },
    });
    let closed = 0;
    const now = new Date();
    for (const r of rows) {
      const hours =
        (now.getTime() - new Date(r.checkIn).getTime()) / 3_600_000;
      const hoursWorked = Number(hours.toFixed(2));
      await prisma.attendance.update({
        where: { id: r.id },
        data: { checkOut: now, hoursWorked },
      });
      closed++;
    }
    await logActivity({
      action: "attendance.bulk_close",
      entityType: "attendance",
      summary: `Đóng ${closed} ca chấm công`,
      metadata: { ids: validIds, count: closed },
    });
    revalidatePath("/attendance");
    revalidatePath("/");
    return { ok: true, closed };
  } catch (e) {
    return {
      ok: false,
      closed: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

export async function bulkDeleteAttendance(
  ids: number[],
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, deleted: 0, error: "Chỉ admin được phép" };
  }
  const validIds = sanitizeIds(ids);
  if (validIds.length === 0) {
    return { ok: false, deleted: 0, error: "Không có lượt chấm công nào được chọn" };
  }
  if (validIds.length > 100) {
    return { ok: false, deleted: 0, error: "Tối đa 100 lượt mỗi lần" };
  }
  try {
    const result = await prisma.attendance.deleteMany({
      where: { id: { in: validIds } },
    });
    await logActivity({
      action: "attendance.bulk_delete",
      entityType: "attendance",
      summary: `Xoá ${result.count} lượt chấm công`,
      metadata: { ids: validIds, count: result.count },
    });
    revalidatePath("/attendance");
    revalidatePath("/");
    return { ok: true, deleted: result.count };
  } catch (e) {
    return {
      ok: false,
      deleted: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
