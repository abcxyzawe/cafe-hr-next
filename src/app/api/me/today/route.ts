import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AttendanceStatus = "checked-in" | "checked-out" | "missing";

type TodayResponse = {
  ok: true;
  asOf: string;
  date: string;
  employee: { id: number; name: string; role: string } | null;
  todayShift: {
    id: number;
    shiftType: string | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
  attendance: {
    checkedInAt: string | null;
    checkedOutAt: string | null;
    hoursWorked: number | null;
    status: AttendanceStatus;
  } | null;
  todayTasks: Array<{
    id: number;
    title: string;
    dueDate: string | null;
    completed: boolean;
  }>;
  pendingLeaves: number;
  recentKudosCount: number;
  monthHoursSoFar: number;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const user = await prisma.user.findUnique({
      where: { id: sess.uid },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: { email: user.email },
      select: { id: true, name: true, role: true },
    });

    if (!employee) {
      const empty: TodayResponse = {
        ok: true,
        asOf: now.toISOString(),
        date: ymd(today),
        employee: null,
        todayShift: null,
        attendance: null,
        todayTasks: [],
        pendingLeaves: 0,
        recentKudosCount: 0,
        monthHoursSoFar: 0,
      };
      return NextResponse.json(empty);
    }

    const [
      shiftRow,
      attendanceRow,
      taskRows,
      pendingLeaves,
      recentKudosCount,
      monthHoursAgg,
    ] = await Promise.all([
      prisma.shift.findFirst({
        where: {
          employeeId: employee.id,
          shiftDate: { gte: today, lt: tomorrow },
        },
        select: {
          id: true,
          shiftType: true,
          startTime: true,
          endTime: true,
        },
        orderBy: { shiftDate: "asc" },
      }),
      prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          checkIn: { gte: today, lt: tomorrow },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          hoursWorked: true,
        },
        orderBy: { checkIn: "desc" },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: employee.id,
          OR: [
            { dueDate: { gte: today, lt: tomorrow } },
            { completedAt: { gte: today, lt: tomorrow } },
            { completedAt: null, dueDate: null },
          ],
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          completedAt: true,
        },
        orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }, { id: "asc" }],
      }),
      prisma.leaveRequest.count({
        where: { employeeId: employee.id, status: "pending" },
      }),
      prisma.activityLog.count({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employee.id,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.attendance.aggregate({
        where: {
          employeeId: employee.id,
          checkIn: { gte: monthStart },
          checkOut: { not: null },
        },
        _sum: { hoursWorked: true },
      }),
    ]);

    let attendance: TodayResponse["attendance"] = null;
    if (attendanceRow) {
      const status: AttendanceStatus = attendanceRow.checkOut
        ? "checked-out"
        : "checked-in";
      attendance = {
        checkedInAt: attendanceRow.checkIn.toISOString(),
        checkedOutAt: attendanceRow.checkOut
          ? attendanceRow.checkOut.toISOString()
          : null,
        hoursWorked:
          attendanceRow.hoursWorked !== null
            ? Number(attendanceRow.hoursWorked)
            : null,
        status,
      };
    } else {
      attendance = {
        checkedInAt: null,
        checkedOutAt: null,
        hoursWorked: null,
        status: "missing",
      };
    }

    const body: TodayResponse = {
      ok: true,
      asOf: now.toISOString(),
      date: ymd(today),
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
      },
      todayShift: shiftRow
        ? {
            id: shiftRow.id,
            shiftType: shiftRow.shiftType ?? null,
            startTime: shiftRow.startTime ?? null,
            endTime: shiftRow.endTime ?? null,
          }
        : null,
      attendance,
      todayTasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate ? ymd(t.dueDate) : null,
        completed: t.completedAt !== null,
      })),
      pendingLeaves,
      recentKudosCount,
      monthHoursSoFar: Number(monthHoursAgg._sum.hoursWorked ?? 0),
    };

    return NextResponse.json(body);
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
