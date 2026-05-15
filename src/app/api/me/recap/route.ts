import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RecapHighlight = {
  code:
    | "first_shift"
    | "long_day"
    | "kudos_received"
    | "task_completed"
    | "leave_taken"
    | "perfect_attendance"
    | "milestone_streak";
  label: string;
  detail: string;
};

type DayBlock = {
  iso: string;
  weekday: string;
  hoursWorked: number;
  checkinTime: string | null;
  checkoutTime: string | null;
  tasksCompleted: number;
  kudosReceived: number;
  onLeave: boolean;
};

type RecapResponse = {
  ok: true;
  asOf: string;
  windowStartIso: string;
  windowEndIso: string;
  employee: { id: number; name: string; role: string } | null;
  totals: {
    hoursWorked: number;
    daysWorked: number;
    avgHoursPerWorkedDay: number;
    tasksCompleted: number;
    kudosReceived: number;
    onLeaveDays: number;
    onTimeRate: number; // percent
  };
  bestDay: DayBlock | null;
  highlights: RecapHighlight[];
  days: DayBlock[];
  nextWeekShifts: number;
  comparisons: {
    hoursVsPriorWeek: number;
    kudosVsPriorWeek: number;
    tasksVsPriorWeek: number;
  };
};

const WEEKDAY_VI = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = startOfDay(now);
  const windowStart = addDays(today, -6);
  const priorStart = addDays(today, -13);
  const tomorrow = addDays(today, 1);
  const sevenDaysAhead = addDays(tomorrow, 7);

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
      const empty: RecapResponse = {
        ok: true,
        asOf: now.toISOString(),
        windowStartIso: ymd(windowStart),
        windowEndIso: ymd(today),
        employee: null,
        totals: {
          hoursWorked: 0,
          daysWorked: 0,
          avgHoursPerWorkedDay: 0,
          tasksCompleted: 0,
          kudosReceived: 0,
          onLeaveDays: 0,
          onTimeRate: 0,
        },
        bestDay: null,
        highlights: [],
        days: [],
        nextWeekShifts: 0,
        comparisons: {
          hoursVsPriorWeek: 0,
          kudosVsPriorWeek: 0,
          tasksVsPriorWeek: 0,
        },
      };
      return NextResponse.json(empty);
    }

    const [
      attendance,
      attendancePrior,
      tasks,
      tasksPrior,
      kudos,
      kudosPrior,
      leaves,
      upcomingShifts,
      scheduledShifts,
    ] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          checkIn: { gte: windowStart, lt: tomorrow },
        },
        select: { checkIn: true, checkOut: true, hoursWorked: true },
        orderBy: { checkIn: "asc" },
      }),
      prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          checkIn: { gte: priorStart, lt: windowStart },
        },
        select: { hoursWorked: true },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: employee.id,
          completedAt: { gte: windowStart, lt: tomorrow },
        },
        select: { completedAt: true },
      }),
      prisma.task.count({
        where: {
          assigneeId: employee.id,
          completedAt: { gte: priorStart, lt: windowStart },
        },
      }),
      prisma.activityLog.findMany({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employee.id,
          createdAt: { gte: windowStart, lt: tomorrow },
        },
        select: { createdAt: true, summary: true },
      }),
      prisma.activityLog.count({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employee.id,
          createdAt: { gte: priorStart, lt: windowStart },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          status: "approved",
          startDate: { lt: tomorrow },
          endDate: { gte: windowStart },
        },
        select: { startDate: true, endDate: true, type: true },
      }),
      prisma.shift.count({
        where: {
          employeeId: employee.id,
          shiftDate: { gte: tomorrow, lt: sevenDaysAhead },
        },
      }),
      prisma.shift.findMany({
        where: {
          employeeId: employee.id,
          shiftDate: { gte: windowStart, lt: tomorrow },
        },
        select: { shiftDate: true, startTime: true },
      }),
    ]);

    const days: DayBlock[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(windowStart, i);
      days.push({
        iso: ymd(d),
        weekday: WEEKDAY_VI[d.getDay()],
        hoursWorked: 0,
        checkinTime: null,
        checkoutTime: null,
        tasksCompleted: 0,
        kudosReceived: 0,
        onLeave: false,
      });
    }

    const dayByIso = new Map(days.map((d) => [d.iso, d]));

    for (const a of attendance) {
      const key = ymd(startOfDay(a.checkIn));
      const block = dayByIso.get(key);
      if (!block) continue;
      const hours = a.hoursWorked ? Number(a.hoursWorked) : 0;
      block.hoursWorked += hours;
      if (!block.checkinTime || a.checkIn < new Date(`${key}T${block.checkinTime}:00`)) {
        block.checkinTime = hhmm(a.checkIn);
      }
      if (a.checkOut) {
        const out = hhmm(a.checkOut);
        if (!block.checkoutTime || out > block.checkoutTime) {
          block.checkoutTime = out;
        }
      }
    }

    for (const t of tasks) {
      if (!t.completedAt) continue;
      const key = ymd(startOfDay(t.completedAt));
      const block = dayByIso.get(key);
      if (block) block.tasksCompleted += 1;
    }

    for (const k of kudos) {
      const key = ymd(startOfDay(k.createdAt));
      const block = dayByIso.get(key);
      if (block) block.kudosReceived += 1;
    }

    for (const lv of leaves) {
      for (const day of days) {
        const dayDate = new Date(`${day.iso}T00:00:00`);
        if (dayDate >= startOfDay(lv.startDate) && dayDate <= startOfDay(lv.endDate)) {
          day.onLeave = true;
        }
      }
    }

    const totalHours = days.reduce((s, d) => s + d.hoursWorked, 0);
    const daysWorked = days.filter((d) => d.hoursWorked > 0).length;
    const totalTasks = tasks.length;
    const totalKudos = kudos.length;
    const onLeaveDays = days.filter((d) => d.onLeave).length;
    const avgHours = daysWorked > 0 ? totalHours / daysWorked : 0;

    const scheduledByIso = new Map<string, string | null>();
    for (const s of scheduledShifts) {
      scheduledByIso.set(ymd(startOfDay(s.shiftDate)), s.startTime);
    }
    let scheduledCount = 0;
    let onTimeCount = 0;
    for (const day of days) {
      const sched = scheduledByIso.get(day.iso);
      if (sched === undefined) continue;
      scheduledCount += 1;
      if (day.checkinTime && sched) {
        if (day.checkinTime <= sched) onTimeCount += 1;
      }
    }
    const onTimeRate =
      scheduledCount > 0 ? Math.round((onTimeCount / scheduledCount) * 100) : 0;

    let bestDay: DayBlock | null = null;
    for (const day of days) {
      const score = day.hoursWorked * 1 + day.tasksCompleted * 2 + day.kudosReceived * 3;
      const bestScore = bestDay
        ? bestDay.hoursWorked + bestDay.tasksCompleted * 2 + bestDay.kudosReceived * 3
        : -1;
      if (score > bestScore) bestDay = day;
    }
    if (bestDay && bestDay.hoursWorked === 0 && bestDay.tasksCompleted === 0 && bestDay.kudosReceived === 0) {
      bestDay = null;
    }

    const highlights: RecapHighlight[] = [];
    if (daysWorked >= 6) {
      highlights.push({
        code: "perfect_attendance",
        label: "Đi làm cả tuần",
        detail: `${daysWorked}/7 ngày có chấm công — phong độ tuyệt vời.`,
      });
    }
    if (bestDay && bestDay.hoursWorked > 0) {
      const fmt =
        bestDay.iso.split("-").reverse().slice(0, 2).join("/");
      highlights.push({
        code: "long_day",
        label: "Ngày năng suất nhất",
        detail: `${bestDay.weekday} ${fmt} — ${bestDay.hoursWorked.toFixed(1)} giờ${
          bestDay.tasksCompleted > 0 ? ` · ${bestDay.tasksCompleted} task xong` : ""
        }${bestDay.kudosReceived > 0 ? ` · ${bestDay.kudosReceived} kudos` : ""}.`,
      });
    }
    if (totalKudos > 0) {
      highlights.push({
        code: "kudos_received",
        label: "Được khen ngợi",
        detail: `Đã nhận ${totalKudos} lời khen trong tuần — đồng đội ghi nhận bạn.`,
      });
    }
    if (totalTasks > 0) {
      highlights.push({
        code: "task_completed",
        label: "Hoàn thành công việc",
        detail: `${totalTasks} task xong trong tuần.`,
      });
    }
    if (onLeaveDays > 0) {
      highlights.push({
        code: "leave_taken",
        label: "Nghỉ phép",
        detail: `${onLeaveDays} ngày nghỉ phép đã được duyệt — cân bằng công việc & cuộc sống.`,
      });
    }
    if (daysWorked >= 1 && days[0].hoursWorked > 0) {
      highlights.push({
        code: "first_shift",
        label: "Mở màn tuần",
        detail: `Khởi đầu vào ${days[0].weekday} — duy trì phong độ.`,
      });
    }

    const priorHours = attendancePrior.reduce(
      (s, a) => s + (a.hoursWorked ? Number(a.hoursWorked) : 0),
      0,
    );

    const response: RecapResponse = {
      ok: true,
      asOf: now.toISOString(),
      windowStartIso: ymd(windowStart),
      windowEndIso: ymd(today),
      employee,
      totals: {
        hoursWorked: Math.round(totalHours * 10) / 10,
        daysWorked,
        avgHoursPerWorkedDay: Math.round(avgHours * 10) / 10,
        tasksCompleted: totalTasks,
        kudosReceived: totalKudos,
        onLeaveDays,
        onTimeRate,
      },
      bestDay,
      highlights: highlights.slice(0, 6),
      days,
      nextWeekShifts: upcomingShifts,
      comparisons: {
        hoursVsPriorWeek: Math.round((totalHours - priorHours) * 10) / 10,
        kudosVsPriorWeek: totalKudos - kudosPrior,
        tasksVsPriorWeek: totalTasks - tasksPrior,
      },
    };

    return NextResponse.json(response, {
      headers: { "cache-control": "private, max-age=120" },
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
