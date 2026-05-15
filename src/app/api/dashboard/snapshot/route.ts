import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ShiftTypeKey = "morning" | "afternoon" | "evening";

type EmployeesSection = {
  total: number;
  activeToday: number;
};

type ShiftsSection = {
  today: number;
  byType: Record<ShiftTypeKey, number>;
};

type AttendanceSection = {
  checkinsToday: number;
  checkoutsToday: number;
  avgHoursToday: number;
  checkinsYesterday: number;
  deltaPct: number;
};

type LeavesSection = {
  pending: number;
  onLeaveToday: number;
  approvedFuture: number;
};

type TasksSection = {
  open: number;
  overdue: number;
  completedToday: number;
};

type ActivitySection = {
  last24h: number;
  kudosLast7d: number;
  kudosPriorWeek: number;
};

type TopActiveEntry = {
  id: number;
  name: string;
  role: string;
  checkinsToday: number;
};

type SnapshotBody = {
  ok: true;
  generatedAt: string;
  date: string;
  employees: EmployeesSection | null;
  shifts: ShiftsSection | null;
  attendance: AttendanceSection | null;
  leaves: LeavesSection | null;
  tasks: TasksSection | null;
  activity: ActivitySection | null;
  topActiveToday: TopActiveEntry[] | null;
  errors?: Record<string, string>;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
}

async function runSection<T>(
  name: string,
  errors: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    errors[name] = errMsg(e);
    return null;
  }
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
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const errors: Record<string, string> = {};

  try {
    const [
      employeesResult,
      shiftsResult,
      attendanceResult,
      leavesResult,
      tasksResult,
      activityResult,
      topActiveResult,
    ] = await Promise.all([
      // Employees: total + activeToday (with shift today OR attendance today)
      runSection("employees", errors, async (): Promise<EmployeesSection> => {
        const [total, shiftEmpIds, attendanceEmpIds] = await Promise.all([
          prisma.employee.count(),
          prisma.shift.findMany({
            where: { shiftDate: { gte: today, lt: tomorrow } },
            select: { employeeId: true },
            distinct: ["employeeId"],
          }),
          prisma.attendance.findMany({
            where: { checkIn: { gte: today, lt: tomorrow } },
            select: { employeeId: true },
            distinct: ["employeeId"],
          }),
        ]);
        const activeSet = new Set<number>();
        for (const r of shiftEmpIds) activeSet.add(r.employeeId);
        for (const r of attendanceEmpIds) activeSet.add(r.employeeId);
        return { total, activeToday: activeSet.size };
      }),

      // Shifts today: total + byType (morning/afternoon/evening)
      runSection("shifts", errors, async (): Promise<ShiftsSection> => {
        const grouped = await prisma.shift.groupBy({
          by: ["shiftType"],
          where: { shiftDate: { gte: today, lt: tomorrow } },
          _count: { _all: true },
        });
        const byType: Record<ShiftTypeKey, number> = {
          morning: 0,
          afternoon: 0,
          evening: 0,
        };
        let total = 0;
        for (const row of grouped) {
          const c = row._count._all;
          total += c;
          if (row.shiftType) {
            byType[row.shiftType as ShiftTypeKey] += c;
          }
        }
        return { today: total, byType };
      }),

      // Attendance today: checkins, checkouts, avg hours, yesterday checkins, delta
      runSection(
        "attendance",
        errors,
        async (): Promise<AttendanceSection> => {
          const [
            checkinsToday,
            checkoutsToday,
            avgAgg,
            checkinsYesterday,
          ] = await Promise.all([
            prisma.attendance.count({
              where: { checkIn: { gte: today, lt: tomorrow } },
            }),
            prisma.attendance.count({
              where: {
                checkIn: { gte: today, lt: tomorrow },
                checkOut: { not: null },
              },
            }),
            prisma.attendance.aggregate({
              where: {
                checkIn: { gte: today, lt: tomorrow },
                checkOut: { not: null },
              },
              _avg: { hoursWorked: true },
            }),
            prisma.attendance.count({
              where: { checkIn: { gte: yesterday, lt: today } },
            }),
          ]);
          const avgHoursToday = avgAgg._avg.hoursWorked
            ? Number(avgAgg._avg.hoursWorked)
            : 0;
          const deltaPct =
            checkinsYesterday > 0
              ? ((checkinsToday - checkinsYesterday) / checkinsYesterday) * 100
              : checkinsToday > 0
                ? 100
                : 0;
          return {
            checkinsToday,
            checkoutsToday,
            avgHoursToday: Math.round(avgHoursToday * 100) / 100,
            checkinsYesterday,
            deltaPct: Math.round(deltaPct * 10) / 10,
          };
        },
      ),

      // Leaves: pending, onLeaveToday, approvedFuture
      runSection("leaves", errors, async (): Promise<LeavesSection> => {
        const [pending, onLeaveToday, approvedFuture] = await Promise.all([
          prisma.leaveRequest.count({ where: { status: "pending" } }),
          prisma.leaveRequest.count({
            where: {
              status: "approved",
              startDate: { lte: today },
              endDate: { gte: today },
            },
          }),
          prisma.leaveRequest.count({
            where: {
              status: "approved",
              startDate: { gt: today },
            },
          }),
        ]);
        return { pending, onLeaveToday, approvedFuture };
      }),

      // Tasks: open, overdue, completedToday
      runSection("tasks", errors, async (): Promise<TasksSection> => {
        const [open, overdue, completedToday] = await Promise.all([
          prisma.task.count({ where: { completedAt: null } }),
          prisma.task.count({
            where: {
              completedAt: null,
              dueDate: { lt: today },
            },
          }),
          prisma.task.count({
            where: { completedAt: { gte: today, lt: tomorrow } },
          }),
        ]);
        return { open, overdue, completedToday };
      }),

      // Activity: last24h count + kudos last 7d + prior week
      runSection("activity", errors, async (): Promise<ActivitySection> => {
        const [last24hCount, kudosLast7d, kudosPriorWeek] = await Promise.all([
          prisma.activityLog.count({
            where: { createdAt: { gte: last24h } },
          }),
          prisma.activityLog.count({
            where: {
              action: "kudos.give",
              createdAt: { gte: sevenDaysAgo },
            },
          }),
          prisma.activityLog.count({
            where: {
              action: "kudos.give",
              createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
            },
          }),
        ]);
        return {
          last24h: last24hCount,
          kudosLast7d,
          kudosPriorWeek,
        };
      }),

      // Top 3 active employees today by checkins
      runSection(
        "topActiveToday",
        errors,
        async (): Promise<TopActiveEntry[]> => {
          const grouped = await prisma.attendance.groupBy({
            by: ["employeeId"],
            where: { checkIn: { gte: today, lt: tomorrow } },
            _count: { _all: true },
            orderBy: { _count: { id: "desc" } },
            take: 3,
          });
          if (grouped.length === 0) return [];
          const ids = grouped.map((g) => g.employeeId);
          const employees = await prisma.employee.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, role: true },
          });
          const empMap = new Map<
            number,
            { id: number; name: string; role: string }
          >();
          for (const e of employees) {
            empMap.set(e.id, { id: e.id, name: e.name, role: e.role });
          }
          const out: TopActiveEntry[] = [];
          for (const g of grouped) {
            const e = empMap.get(g.employeeId);
            if (!e) continue;
            out.push({
              id: e.id,
              name: e.name,
              role: e.role,
              checkinsToday: g._count._all,
            });
          }
          return out;
        },
      ),
    ]);

    const body: SnapshotBody = {
      ok: true,
      generatedAt: now.toISOString(),
      date: ymd(today),
      employees: employeesResult,
      shifts: shiftsResult,
      attendance: attendanceResult,
      leaves: leavesResult,
      tasks: tasksResult,
      activity: activityResult,
      topActiveToday: topActiveResult,
    };
    if (Object.keys(errors).length > 0) {
      body.errors = errors;
    }

    return NextResponse.json(body, {
      headers: {
        "cache-control": "private, max-age=30, s-maxage=30",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: errMsg(e),
      },
      { status: 503 },
    );
  }
}
