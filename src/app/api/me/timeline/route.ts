import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TimelineType =
  | "checkin"
  | "checkout"
  | "leave-submit"
  | "leave-decided"
  | "task-complete"
  | "kudos-received";

type TimelineItem = {
  type: TimelineType;
  at: string;
  summary: string;
  detail?: Record<string, unknown>;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parsePositiveInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

function fmtTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
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

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = parsePositiveInt(url.searchParams.get("limit")) ?? 50;
  const limit = clamp(limitRaw, 1, 200);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

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
      return NextResponse.json({
        ok: true,
        asOf: now.toISOString(),
        employee: null,
        items: [],
      });
    }

    const [attendance, leaves, tasks, kudos] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          checkIn: { gte: windowStart },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          hoursWorked: true,
        },
        orderBy: { checkIn: "desc" },
        take: limit,
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          OR: [
            { createdAt: { gte: windowStart } },
            { decidedAt: { gte: windowStart } },
          ],
        },
        select: {
          id: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          decidedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.task.findMany({
        where: {
          assigneeId: employee.id,
          completedAt: { not: null, gte: windowStart },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          completedAt: true,
        },
        orderBy: { completedAt: "desc" },
        take: limit,
      }),
      prisma.activityLog.findMany({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employee.id,
          createdAt: { gte: windowStart },
        },
        select: {
          id: true,
          summary: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    const items: TimelineItem[] = [];

    for (const a of attendance) {
      items.push({
        type: "checkin",
        at: a.checkIn.toISOString(),
        summary: `Chấm công vào lúc ${fmtTime(a.checkIn)} ${fmtDate(a.checkIn)}`,
        detail: { attendanceId: a.id },
      });
      if (a.checkOut) {
        items.push({
          type: "checkout",
          at: a.checkOut.toISOString(),
          summary: `Chấm công ra lúc ${fmtTime(a.checkOut)} ${fmtDate(a.checkOut)}`,
          detail: {
            attendanceId: a.id,
            hoursWorked:
              a.hoursWorked !== null ? Number(a.hoursWorked) : null,
          },
        });
      }
    }

    for (const lr of leaves) {
      const typeLabel = LEAVE_TYPE_LABEL[lr.type] ?? lr.type;
      if (lr.createdAt >= windowStart) {
        items.push({
          type: "leave-submit",
          at: lr.createdAt.toISOString(),
          summary: `Gửi đơn ${typeLabel} (${fmtDate(lr.startDate)} - ${fmtDate(lr.endDate)})`,
          detail: {
            leaveId: lr.id,
            type: lr.type,
            status: lr.status,
            startDate: lr.startDate.toISOString().slice(0, 10),
            endDate: lr.endDate.toISOString().slice(0, 10),
          },
        });
      }
      if (lr.decidedAt && lr.decidedAt >= windowStart) {
        const statusLabel = LEAVE_STATUS_LABEL[lr.status] ?? lr.status;
        items.push({
          type: "leave-decided",
          at: lr.decidedAt.toISOString(),
          summary: `Đơn ${typeLabel} ${statusLabel}`,
          detail: {
            leaveId: lr.id,
            type: lr.type,
            status: lr.status,
          },
        });
      }
    }

    for (const t of tasks) {
      if (!t.completedAt) continue;
      items.push({
        type: "task-complete",
        at: t.completedAt.toISOString(),
        summary: `Hoàn thành công việc: ${t.title}`,
        detail: {
          taskId: t.id,
          priority: t.priority,
        },
      });
    }

    for (const k of kudos) {
      const meta =
        k.metadata && typeof k.metadata === "object" && !Array.isArray(k.metadata)
          ? (k.metadata as Record<string, unknown>)
          : {};
      items.push({
        type: "kudos-received",
        at: k.createdAt.toISOString(),
        summary: k.summary || "Bạn nhận được lời khen",
        detail: {
          activityId: k.id,
          ...meta,
        },
      });
    }

    items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const sliced = items.slice(0, limit);

    return NextResponse.json({
      ok: true,
      asOf: now.toISOString(),
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
      },
      items: sliced,
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
