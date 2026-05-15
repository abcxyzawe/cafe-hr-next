import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const dbStart = Date.now();

  try {
    const [
      employees,
      shifts,
      attendance,
      attendanceOpen,
      leaves,
      leavesPending,
      tasks,
      tasksOpen,
      payrollRows,
      payrollPeriods,
      notes,
      kudos,
      activityLogs,
      users,
      dailyQuotes,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.shift.count(),
      prisma.attendance.count(),
      prisma.attendance.count({ where: { checkOut: null } }),
      prisma.leaveRequest.count(),
      prisma.leaveRequest.count({ where: { status: "pending" } }),
      prisma.task.count(),
      prisma.task.count({ where: { completedAt: null } }),
      prisma.payroll.count(),
      prisma.payroll.findMany({
        select: { period: true },
        distinct: ["period"],
      }),
      prisma.employeeNote.count(),
      prisma.activityLog.count({ where: { action: "kudos.give" } }),
      prisma.activityLog.count(),
      prisma.user.count(),
      prisma.dailyQuote.count(),
    ]);

    return NextResponse.json({
      ok: true,
      asOf: new Date().toISOString(),
      dbLatencyMs: Date.now() - dbStart,
      counts: {
        employees,
        users,
        shifts,
        attendance,
        attendanceOpen,
        leaves,
        leavesPending,
        tasks,
        tasksOpen,
        payrollRows,
        payrollPeriods: payrollPeriods.length,
        notes,
        kudos,
        activityLogs,
        dailyQuotes,
      },
      payrollPeriodList: payrollPeriods
        .map((p) => p.period)
        .sort()
        .reverse()
        .slice(0, 24),
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
