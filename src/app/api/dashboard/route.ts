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

function currentPeriod(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekStart = startOfWeekMonday(now);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const period = currentPeriod(now);

  // DB latency probe
  let dbOk = true;
  let dbLatencyMs: number | null = null;
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbOk = false;
    dbLatencyMs = null;
  }

  if (!dbOk) {
    return NextResponse.json(
      {
        ok: false,
        asOf: now.toISOString(),
        period,
        weekStart: ymd(weekStart),
        health: {
          dbOk: false,
          dbLatencyMs: null,
          xaiConfigured: !!process.env.XAI_API_KEY,
        },
        error: "database_unavailable",
      },
      { status: 503 },
    );
  }

  try {
    const [
      employeesTotal,
      employeesByRoleRows,
      shiftsToday,
      shiftsWeek,
      attendanceTodayRows,
      openAttendanceCount,
      attendanceWeekAgg,
      leavesProcessedWeek,
      kudosWeek,
      payrollAgg,
      pendingLeaves,
      overdueTasks,
      employeeBirthdays,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      prisma.shift.count({
        where: { shiftDate: { gte: today, lt: tomorrow } },
      }),
      prisma.shift.count({
        where: { shiftDate: { gte: weekStart, lt: nextWeek } },
      }),
      prisma.attendance.findMany({
        where: { checkIn: { gte: today, lt: tomorrow } },
        select: { employeeId: true },
      }),
      prisma.attendance.count({
        where: { checkOut: null },
      }),
      prisma.attendance.aggregate({
        where: { checkIn: { gte: weekStart, lt: nextWeek } },
        _sum: { hoursWorked: true },
      }),
      prisma.leaveRequest.count({
        where: {
          decidedAt: { gte: weekStart, lt: nextWeek },
          status: { in: ["approved", "rejected"] },
        },
      }),
      prisma.activityLog.count({
        where: {
          action: "kudos.give",
          createdAt: { gte: weekStart, lt: nextWeek },
        },
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
      prisma.employee.findMany({
        where: { dateOfBirth: { not: null } },
        select: { dateOfBirth: true },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const r of employeesByRoleRows) {
      byRole[r.role] = r._count._all;
    }

    const distinctAttendees = new Set<number>();
    for (const a of attendanceTodayRows) {
      distinctAttendees.add(a.employeeId);
    }

    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    let birthdaysToday = 0;
    for (const e of employeeBirthdays) {
      const dob = e.dateOfBirth;
      if (!dob) continue;
      if (dob.getMonth() === todayMonth && dob.getDate() === todayDate) {
        birthdaysToday += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      asOf: now.toISOString(),
      period,
      weekStart: ymd(weekStart),
      employees: {
        total: employeesTotal,
        byRole,
      },
      today: {
        shiftsScheduled: shiftsToday,
        attendanceCount: distinctAttendees.size,
        openAttendance: openAttendanceCount,
        birthdays: birthdaysToday,
      },
      week: {
        totalHours: Number(attendanceWeekAgg._sum.hoursWorked ?? 0),
        totalShifts: shiftsWeek,
        leavesProcessed: leavesProcessedWeek,
        kudosGiven: kudosWeek,
      },
      payroll: {
        period,
        totalPay: Number(payrollAgg._sum.totalPay ?? 0),
        totalHours: Number(payrollAgg._sum.totalHours ?? 0),
        snapshotCount: payrollAgg._count._all,
      },
      todo: {
        pendingLeaves,
        overdueTasks,
      },
      health: {
        dbOk: true,
        dbLatencyMs,
        xaiConfigured: !!process.env.XAI_API_KEY,
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
