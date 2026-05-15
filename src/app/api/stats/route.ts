import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeekMonday(d: Date): Date {
  const out = startOfDay(d);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekStart = startOfWeekMonday(now);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const period = currentPeriod();

  try {
    const [
      employees,
      employeesByRole,
      shiftsThisWeek,
      attendanceToday,
      openAttendance,
      payrollPeriod,
      pendingLeaves,
      overdueTasks,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      prisma.shift.count({
        where: { shiftDate: { gte: weekStart, lt: nextWeek } },
      }),
      prisma.attendance.count({
        where: { checkIn: { gte: today, lt: tomorrow } },
      }),
      prisma.attendance.count({
        where: { checkOut: null },
      }),
      prisma.payroll.aggregate({
        where: { period },
        _sum: { totalPay: true, totalHours: true },
        _count: { _all: true },
      }),
      prisma.leaveRequest.count({ where: { status: "pending" } }),
      prisma.task.count({
        where: {
          completedAt: null,
          dueDate: { lt: now },
        },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const r of employeesByRole) {
      byRole[r.role] = r._count._all;
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      period,
      week: {
        startsOn: weekStart.toISOString().slice(0, 10),
        shiftsScheduled: shiftsThisWeek,
      },
      employees: {
        total: employees,
        byRole,
      },
      attendance: {
        today: attendanceToday,
        currentlyOpen: openAttendance,
      },
      payroll: {
        period,
        totalPay: Number(payrollPeriod._sum.totalPay ?? 0),
        totalHours: Number(payrollPeriod._sum.totalHours ?? 0),
        snapshotCount: payrollPeriod._count._all,
      },
      todo: {
        pendingLeaves,
        overdueTasks,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 300) : String(e),
      },
      { status: 503 },
    );
  }
}
