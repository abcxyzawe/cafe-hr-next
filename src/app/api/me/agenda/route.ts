import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AgendaType =
  | "shift"
  | "leave"
  | "task-due"
  | "kudos-received"
  | "birthday";

type AgendaItem = {
  type: AgendaType;
  date: string;
  time: string | null;
  title: string;
  detail: string;
  href: string | null;
};

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function fmtDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, "0");
  const mm = m[2];
  return `${hh}:${mm}`;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: "nghỉ phép năm",
  sick: "nghỉ ốm",
  personal: "nghỉ việc riêng",
  unpaid: "nghỉ không lương",
};

const LEAVE_STATUS_LABEL: Record<string, string> = {
  pending: "chờ duyệt",
  approved: "đã duyệt",
  rejected: "bị từ chối",
  cancelled: "đã hủy",
};

const SHIFT_TYPE_LABEL: Record<string, string> = {
  morning: "ca sáng",
  afternoon: "ca chiều",
  evening: "ca tối",
  night: "ca đêm",
  full: "ca cả ngày",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "thấp",
  normal: "thường",
  high: "cao",
  urgent: "khẩn cấp",
};

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const weekEndDateOnly = new Date(weekStart);
  weekEndDateOnly.setDate(weekEndDateOnly.getDate() + 6);

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
      select: {
        id: true,
        name: true,
        role: true,
        dateOfBirth: true,
      },
    });

    if (!employee) {
      return NextResponse.json({
        ok: true,
        asOf: now.toISOString(),
        weekStart: fmtDate(weekStart),
        weekEnd: fmtDate(weekEndDateOnly),
        employee: null,
        items: [],
        summary: {
          shifts: 0,
          leaves: 0,
          tasksDue: 0,
          kudosReceived: 0,
        },
      });
    }

    const [shifts, leaves, tasks, kudos] = await Promise.all([
      prisma.shift.findMany({
        where: {
          employeeId: employee.id,
          shiftDate: { gte: weekStart, lt: nextWeek },
        },
        select: {
          id: true,
          shiftDate: true,
          shiftType: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          startDate: { lt: nextWeek },
          endDate: { gte: weekStart },
        },
        select: {
          id: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: employee.id,
          completedAt: null,
          dueDate: { gte: weekStart, lt: nextWeek },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.activityLog.findMany({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employee.id,
          createdAt: { gte: weekStart, lt: nextWeek },
        },
        select: {
          id: true,
          summary: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const items: AgendaItem[] = [];

    for (const s of shifts) {
      const typeLabel = s.shiftType
        ? (SHIFT_TYPE_LABEL[s.shiftType] ?? s.shiftType)
        : "ca làm";
      const start = normalizeTime(s.startTime);
      const end = normalizeTime(s.endTime);
      const detail =
        start && end
          ? `${typeLabel} ${start} - ${end}`
          : start
            ? `${typeLabel} từ ${start}`
            : typeLabel;
      items.push({
        type: "shift",
        date: fmtDate(s.shiftDate),
        time: start,
        title: `Ca làm: ${typeLabel}`,
        detail,
        href: `/schedule?date=${fmtDate(s.shiftDate)}`,
      });
    }

    for (const lr of leaves) {
      const typeLabel = LEAVE_TYPE_LABEL[lr.type] ?? lr.type;
      const statusLabel = LEAVE_STATUS_LABEL[lr.status] ?? lr.status;
      const overlapStart = lr.startDate < weekStart ? weekStart : lr.startDate;
      items.push({
        type: "leave",
        date: fmtDate(overlapStart),
        time: null,
        title: `Nghỉ: ${typeLabel}`,
        detail: `${statusLabel} (${fmtDate(lr.startDate)} - ${fmtDate(lr.endDate)})`,
        href: `/leave?id=${lr.id}`,
      });
    }

    for (const t of tasks) {
      if (!t.dueDate) continue;
      const priorityLabel = PRIORITY_LABEL[t.priority] ?? t.priority;
      items.push({
        type: "task-due",
        date: fmtDate(t.dueDate),
        time: null,
        title: `Hạn công việc: ${t.title}`,
        detail: `Ưu tiên ${priorityLabel}`,
        href: `/tasks?id=${t.id}`,
      });
    }

    for (const k of kudos) {
      const hh = String(k.createdAt.getHours()).padStart(2, "0");
      const mm = String(k.createdAt.getMinutes()).padStart(2, "0");
      items.push({
        type: "kudos-received",
        date: fmtDate(k.createdAt),
        time: `${hh}:${mm}`,
        title: "Bạn nhận được lời khen",
        detail: k.summary || "Lời khen từ đồng nghiệp",
        href: `/kudos?id=${k.id}`,
      });
    }

    if (employee.dateOfBirth) {
      const dob = employee.dateOfBirth;
      const dobMonth = dob.getMonth();
      const dobDay = dob.getDate();
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        if (day.getMonth() === dobMonth && day.getDate() === dobDay) {
          items.push({
            type: "birthday",
            date: fmtDate(day),
            time: null,
            title: "Sinh nhật của bạn",
            detail: "Chúc mừng sinh nhật!",
            href: null,
          });
          break;
        }
      }
    }

    items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const at = a.time ?? "";
      const bt = b.time ?? "";
      if (at === bt) return 0;
      if (at === "") return 1;
      if (bt === "") return -1;
      return at < bt ? -1 : 1;
    });

    const summary = {
      shifts: 0,
      leaves: 0,
      tasksDue: 0,
      kudosReceived: 0,
    };
    for (const it of items) {
      if (it.type === "shift") summary.shifts += 1;
      else if (it.type === "leave") summary.leaves += 1;
      else if (it.type === "task-due") summary.tasksDue += 1;
      else if (it.type === "kudos-received") summary.kudosReceived += 1;
    }

    return NextResponse.json({
      ok: true,
      asOf: now.toISOString(),
      weekStart: fmtDate(weekStart),
      weekEnd: fmtDate(weekEndDateOnly),
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
      },
      items,
      summary,
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
