import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { upcomingBirthdays } from "@/lib/birthday";

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
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
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
      employeeCount,
      employeesByRole,
      shiftsToday,
      shiftsWeek,
      attendanceTodayList,
      openAttendance,
      payroll,
      pendingLeaves,
      overdueTasks,
      birthdays,
      hoursWeek,
      kudosWeek,
      todaysShiftsDetail,
      activeLeavesToday,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.groupBy({ by: ["role"], _count: { _all: true } }),
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
      prisma.attendance.count({ where: { checkOut: null } }),
      prisma.payroll.aggregate({
        where: { period },
        _sum: { totalPay: true, totalHours: true },
        _count: { _all: true },
      }),
      prisma.leaveRequest.count({ where: { status: "pending" } }),
      prisma.task.count({
        where: { completedAt: null, dueDate: { lt: now } },
      }),
      upcomingBirthdays(14),
      prisma.attendance.aggregate({
        where: {
          checkIn: { gte: weekStart, lt: nextWeek },
          checkOut: { not: null },
        },
        _sum: { hoursWorked: true },
      }),
      prisma.activityLog.count({
        where: {
          action: "kudos.give",
          createdAt: { gte: weekStart, lt: nextWeek },
        },
      }),
      prisma.shift.findMany({
        where: { shiftDate: { gte: today, lt: tomorrow } },
        include: {
          employee: { select: { id: true, name: true, role: true } },
        },
        orderBy: [{ shiftType: "asc" }, { startTime: "asc" }],
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: { in: ["approved", "pending"] },
          startDate: { lte: today },
          endDate: { gte: today },
        },
        include: {
          employee: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const r of employeesByRole) byRole[r.role] = r._count._all;

    return NextResponse.json({
      ok: true,
      asOf: now.toISOString(),
      period,
      employees: { total: employeeCount, byRole },
      today: {
        date: today.toISOString().slice(0, 10),
        shiftsScheduled: shiftsToday,
        attendanceCount: new Set(attendanceTodayList.map((a) => a.employeeId))
          .size,
        openAttendance,
        shifts: todaysShiftsDetail.map((s) => ({
          id: s.id,
          employee: s.employee,
          shiftType: s.shiftType,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        leaves: activeLeavesToday.map((l) => ({
          id: l.id,
          employee: l.employee,
          type: l.type,
          status: l.status,
          startDate: l.startDate.toISOString().slice(0, 10),
          endDate: l.endDate.toISOString().slice(0, 10),
        })),
      },
      week: {
        startsOn: weekStart.toISOString().slice(0, 10),
        shifts: shiftsWeek,
        hours: Number(hoursWeek._sum.hoursWorked ?? 0),
        kudos: kudosWeek,
      },
      payroll: {
        period,
        totalPay: Number(payroll._sum.totalPay ?? 0),
        totalHours: Number(payroll._sum.totalHours ?? 0),
        snapshotCount: payroll._count._all,
      },
      todo: { pendingLeaves, overdueTasks },
      birthdaysWindow: birthdays.map((b) => ({
        employeeId: b.id,
        name: b.name,
        role: b.role,
        avatarUrl: b.avatarUrl,
        upcomingDate: b.upcomingDate.toISOString().slice(0, 10),
        daysUntil: b.daysUntil,
        turningAge: b.turningAge,
      })),
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
