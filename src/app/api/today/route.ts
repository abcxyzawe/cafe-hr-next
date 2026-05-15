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
  const todayIso = today.toISOString().slice(0, 10);

  try {
    const [shifts, attendance, leaves] = await Promise.all([
      prisma.shift.findMany({
        where: { shiftDate: { gte: today, lt: tomorrow } },
        include: {
          employee: { select: { id: true, name: true, role: true } },
        },
        orderBy: [{ shiftType: "asc" }, { startTime: "asc" }],
      }),
      prisma.attendance.findMany({
        where: { checkIn: { gte: today, lt: tomorrow } },
        select: {
          id: true,
          employeeId: true,
          checkIn: true,
          checkOut: true,
        },
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

    const checkInByEmployee = new Map<number, { checkIn: Date; checkOut: Date | null }>();
    for (const a of attendance) {
      const cur = checkInByEmployee.get(a.employeeId);
      if (!cur || a.checkIn < cur.checkIn) {
        checkInByEmployee.set(a.employeeId, {
          checkIn: a.checkIn,
          checkOut: a.checkOut,
        });
      }
    }

    const shiftRows = shifts.map((s) => {
      const att = checkInByEmployee.get(s.employeeId);
      let attendanceStatus: "checked-in" | "checked-out" | "missing";
      if (!att) attendanceStatus = "missing";
      else if (att.checkOut) attendanceStatus = "checked-out";
      else attendanceStatus = "checked-in";
      return {
        id: s.id,
        employee: s.employee,
        shiftType: s.shiftType,
        startTime: s.startTime,
        endTime: s.endTime,
        attendance: att
          ? {
              checkIn: att.checkIn.toISOString(),
              checkOut: att.checkOut ? att.checkOut.toISOString() : null,
            }
          : null,
        attendanceStatus,
      };
    });

    return NextResponse.json({
      ok: true,
      date: todayIso,
      generatedAt: now.toISOString(),
      summary: {
        scheduledShifts: shifts.length,
        distinctScheduledEmployees: new Set(shifts.map((s) => s.employeeId)).size,
        actualCheckIns: checkInByEmployee.size,
        currentlyOpen: Array.from(checkInByEmployee.values()).filter(
          (a) => a.checkOut === null,
        ).length,
        leavesActive: leaves.length,
      },
      shifts: shiftRows,
      leaves: leaves.map((l) => ({
        id: l.id,
        employee: l.employee,
        type: l.type,
        status: l.status,
        startDate: l.startDate.toISOString().slice(0, 10),
        endDate: l.endDate.toISOString().slice(0, 10),
        reason: l.reason,
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
