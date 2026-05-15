"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateBirthdayWish, generateBirthdayImage } from "@/lib/xai";

export async function generateBirthdayCardAction(
  employeeId: number,
): Promise<
  | { ok: true; wish: string; imageUrl: string }
  | { ok: false; error: string }
> {
  try {
    const sess = await getSession();
    if (!sess) return { ok: false, error: "Chưa đăng nhập" };
    if (sess.role !== "admin") {
      return { ok: false, error: "Chỉ admin mới có thể tạo thiệp sinh nhật" };
    }

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return { ok: false, error: "ID nhân viên không hợp lệ" };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, role: true, dateOfBirth: true },
    });
    if (!employee) return { ok: false, error: "Không tìm thấy nhân viên" };

    let turningAge = 25;
    if (employee.dateOfBirth) {
      const dob = new Date(employee.dateOfBirth);
      const now = new Date();
      const dobYear = dob.getFullYear();
      const currentYear = now.getFullYear();
      // Age the employee turns in the current calendar year.
      const ageThisYear = currentYear - dobYear;
      if (ageThisYear > 0 && ageThisYear < 120) {
        turningAge = ageThisYear;
      }
    }

    const [wishRes, imageRes] = await Promise.all([
      generateBirthdayWish({
        name: employee.name,
        role: employee.role,
        turningAge,
      }),
      generateBirthdayImage(employee.name),
    ]);

    return { ok: true, wish: wishRes.content, imageUrl: imageRes.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không tạo được thiệp sinh nhật";
    return { ok: false, error: msg };
  }
}
