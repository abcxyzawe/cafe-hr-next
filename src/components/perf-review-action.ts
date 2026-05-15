"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generatePerformanceReview } from "@/lib/xai";

export type PerfReviewPeriod = "week" | "month";
export type PerfReviewTone = "balanced" | "encouraging" | "critical";

export type PerfReviewActionResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

function parseHHMM(t: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

function periodStart(period: PerfReviewPeriod, now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }
  return start;
}

export type PerfReviewEmployeeOption = {
  id: number;
  name: string;
  role: string;
};

export async function listEmployeesForReviewAction(): Promise<
  | { ok: true; employees: PerfReviewEmployeeOption[] }
  | { ok: false; error: string }
> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Bạn cần đăng nhập" };
  if (sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return { ok: true, employees };
}

export async function generatePerfReviewAction(
  employeeId: number,
  period: PerfReviewPeriod,
  tone: PerfReviewTone,
): Promise<PerfReviewActionResult> {
  try {
    const sess = await getSession();
    if (!sess) return { ok: false, error: "Bạn cần đăng nhập" };
    if (sess.role !== "admin") {
      return { ok: false, error: "Chỉ admin được phép tạo đánh giá" };
    }

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return { ok: false, error: "ID nhân viên không hợp lệ" };
    }
    if (period !== "week" && period !== "month") {
      return { ok: false, error: "Kỳ đánh giá không hợp lệ" };
    }
    if (tone !== "balanced" && tone !== "encouraging" && tone !== "critical") {
      return { ok: false, error: "Tông giọng không hợp lệ" };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, role: true },
    });
    if (!employee) return { ok: false, error: "Không tìm thấy nhân viên" };

    const now = new Date();
    const start = periodStart(period, now);

    const [attendance, shifts, kudosCount] = await Promise.all([
      prisma.attendance.findMany({
        where: { employeeId, checkIn: { gte: start } },
        select: { checkIn: true, hoursWorked: true },
      }),
      prisma.shift.findMany({
        where: { employeeId, shiftDate: { gte: start, lte: now } },
        select: { shiftDate: true, startTime: true },
      }),
      prisma.activityLog.count({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employeeId,
          createdAt: { gte: start },
        },
      }),
    ]);

    const totalHours = attendance.reduce(
      (acc, a) => acc + Number(a.hoursWorked ?? 0),
      0,
    );

    const attendanceByDay = new Map<string, Date>();
    for (const a of attendance) {
      const k = dayKey(a.checkIn);
      const cur = attendanceByDay.get(k);
      if (!cur || a.checkIn < cur) attendanceByDay.set(k, a.checkIn);
    }
    const daysWorked = attendanceByDay.size;

    let attended = 0;
    let lateCount = 0;
    for (const s of shifts) {
      const k = dayKey(s.shiftDate);
      const att = attendanceByDay.get(k);
      if (!att) continue;
      attended++;
      const startHM = parseHHMM(s.startTime);
      if (!startHM) continue;
      const scheduledDate = new Date(s.shiftDate);
      scheduledDate.setHours(startHM.h, startHM.m, 0, 0);
      const diffMin = (att.getTime() - scheduledDate.getTime()) / 60_000;
      if (diffMin > 10) lateCount++;
    }
    const reliabilityPct =
      shifts.length === 0
        ? 0
        : Math.round(Math.min(1, attended / shifts.length) * 100);

    const { content } = await generatePerformanceReview({
      employeeName: employee.name,
      role: employee.role,
      period,
      tone,
      metrics: {
        hours: Number(totalHours.toFixed(2)),
        daysWorked,
        reliabilityPct,
        kudosCount,
        lateCount,
      },
    });

    return { ok: true, content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return { ok: false, error: msg };
  }
}
