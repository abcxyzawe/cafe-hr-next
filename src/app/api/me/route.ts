import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const user = await prisma.user.findUnique({
      where: { id: sess.uid },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        hourlyRate: true,
        dateOfBirth: true,
      },
    });

    let stats: Record<string, number> | null = null;
    if (employee) {
      const [shiftsThisWeek, hoursThisMonth, kudosCount, openAttendance] =
        await Promise.all([
          prisma.shift.count({
            where: {
              employeeId: employee.id,
              shiftDate: { gte: weekStart, lt: nextWeek },
            },
          }),
          prisma.attendance.aggregate({
            where: {
              employeeId: employee.id,
              checkIn: { gte: monthStart, lt: now },
              checkOut: { not: null },
            },
            _sum: { hoursWorked: true },
          }),
          prisma.activityLog.count({
            where: {
              action: "kudos.give",
              entityType: "employee",
              entityId: employee.id,
            },
          }),
          prisma.attendance.count({
            where: { employeeId: employee.id, checkOut: null },
          }),
        ]);
      stats = {
        shiftsThisWeek,
        hoursThisMonth: Number(hoursThisMonth._sum.hoursWorked ?? 0),
        kudosCount,
        currentlyOpen: openAttendance,
      };
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      },
      employee: employee
        ? {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            avatarUrl: employee.avatarUrl,
            hourlyRate: Number(employee.hourlyRate),
            dateOfBirth: employee.dateOfBirth
              ? employee.dateOfBirth.toISOString().slice(0, 10)
              : null,
          }
        : null,
      stats,
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
