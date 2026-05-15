"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { rateLimit, gcRateLimit } from "@/lib/rate-limit";

export type KioskResult = {
  ok: boolean;
  error?: string;
  status?: "checked-in" | "checked-out";
  message?: string;
  hours?: number;
};

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Toggle attendance: if employee has an open session → check-out; else → check-in.
 * Requires valid PIN. Rate-limited per (employee + IP) to mitigate guessing.
 */
export async function kioskToggle(
  employeeId: number,
  pin: string,
): Promise<KioskResult> {
  if (!/^\d{4,8}$/.test(pin)) {
    return { ok: false, error: "PIN không hợp lệ" };
  }

  gcRateLimit();
  const ip = await clientIp();
  const rl = rateLimit({
    key: `kiosk:${employeeId}:${ip}`,
    max: 5,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Quá nhiều lần thử. Đợi ${rl.retryAfter}s.`,
    };
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true, pinHash: true },
  });
  if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };
  if (!emp.pinHash) {
    return {
      ok: false,
      error: "Nhân viên chưa được cấp PIN. Liên hệ quản lý.",
    };
  }

  const valid = await bcrypt.compare(pin, emp.pinHash);
  if (!valid) {
    return { ok: false, error: "PIN không đúng" };
  }

  const open = await prisma.attendance.findFirst({
    where: { employeeId, checkOut: null },
    orderBy: { id: "desc" },
  });

  try {
    if (open) {
      const checkOut = new Date();
      const hours =
        (checkOut.getTime() - new Date(open.checkIn).getTime()) / 3600000;
      await prisma.attendance.update({
        where: { id: open.id },
        data: { checkOut, hoursWorked: Number(hours.toFixed(2)) },
      });
      await logActivity({
        action: "kiosk.checkout",
        entityType: "employee",
        entityId: employeeId,
        summary: `${emp.name} check-out qua kiosk (${hours.toFixed(2)}h)`,
      });
      revalidatePath("/kiosk");
      revalidatePath("/attendance");
      revalidatePath("/");
      return {
        ok: true,
        status: "checked-out",
        hours: Number(hours.toFixed(2)),
        message: `Đã ghi nhận check-out. Hôm nay bạn làm ${hours.toFixed(2)} giờ. Chúc bạn nghỉ ngơi vui vẻ!`,
      };
    } else {
      await prisma.attendance.create({
        data: { employeeId, checkIn: new Date() },
      });
      await logActivity({
        action: "kiosk.checkin",
        entityType: "employee",
        entityId: employeeId,
        summary: `${emp.name} check-in qua kiosk`,
      });
      revalidatePath("/kiosk");
      revalidatePath("/attendance");
      revalidatePath("/");
      return {
        ok: true,
        status: "checked-in",
        message: `Chào ${emp.name}! Đã check-in lúc ${new Date().toLocaleTimeString("vi-VN")}. Chúc bạn ca làm vui vẻ!`,
      };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

/**
 * Admin-only: set or clear an employee's PIN.
 */
export async function setEmployeePin(
  employeeId: number,
  newPin: string | null,
): Promise<{ ok: boolean; error?: string }> {
  // Reuse the existing auth check — import lazily to avoid cycles
  const { getSession } = await import("@/lib/auth");
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true },
  });
  if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

  if (newPin === null || newPin === "") {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { pinHash: null },
    });
    await logActivity({
      action: "employee.pin.clear",
      entityType: "employee",
      entityId: employeeId,
      summary: `Xoá PIN của ${emp.name}`,
    });
    revalidatePath(`/employees/${employeeId}`);
    return { ok: true };
  }

  if (!/^\d{4,8}$/.test(newPin)) {
    return { ok: false, error: "PIN phải là 4-8 chữ số" };
  }

  const pinHash = await bcrypt.hash(newPin, 10);
  await prisma.employee.update({
    where: { id: employeeId },
    data: { pinHash },
  });
  await logActivity({
    action: "employee.pin.set",
    entityType: "employee",
    entityId: employeeId,
    summary: `Cập nhật PIN của ${emp.name}`,
  });
  revalidatePath(`/employees/${employeeId}`);
  return { ok: true };
}
