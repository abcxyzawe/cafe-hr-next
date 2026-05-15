import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NotifType =
  | "leave-decided"
  | "kudos-received"
  | "task-overdue"
  | "shift-tomorrow"
  | "announcement";

type NotifSeverity = "info" | "warning" | "destructive" | "success";

type NotifIcon =
  | "plane"
  | "heart"
  | "list-checks"
  | "calendar-clock"
  | "megaphone";

type NotifItem = {
  type: NotifType;
  at: string;
  title: string;
  detail: string;
  href: string;
  severity: NotifSeverity;
  icon: NotifIcon;
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

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function readMetaString(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    const value = (metadata as Record<string, Prisma.JsonValue>)[key];
    if (typeof value === "string") return value;
  }
  return null;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: "nghỉ phép năm",
  sick: "nghỉ ốm",
  personal: "nghỉ việc riêng",
  unpaid: "nghỉ không lương",
};

const UNREAD_TYPES = new Set<NotifType>([
  "leave-decided",
  "kudos-received",
  "task-overdue",
]);

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = parsePositiveInt(url.searchParams.get("limit")) ?? 20;
  const limit = clamp(limitRaw, 1, 50);

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tomorrowStart = new Date(now);
  tomorrowStart.setHours(0, 0, 0, 0);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

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
      select: { id: true, name: true },
    });

    const items: NotifItem[] = [];

    if (employee) {
      const [leaves, kudos, overdueTasks, tomorrowShifts, announcements] =
        await Promise.all([
          prisma.leaveRequest.findMany({
            where: {
              employeeId: employee.id,
              decidedAt: { gte: fourteenDaysAgo, not: null },
            },
            select: {
              id: true,
              type: true,
              status: true,
              startDate: true,
              endDate: true,
              decidedAt: true,
            },
            orderBy: { decidedAt: "desc" },
            take: limit,
          }),
          prisma.activityLog.findMany({
            where: {
              action: "kudos.give",
              entityType: "employee",
              entityId: employee.id,
              createdAt: { gte: fourteenDaysAgo },
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
          prisma.task.findMany({
            where: {
              assigneeId: employee.id,
              completedAt: null,
              dueDate: { lt: now },
            },
            select: {
              id: true,
              title: true,
              priority: true,
              dueDate: true,
            },
            orderBy: { dueDate: "asc" },
            take: limit,
          }),
          prisma.shift.findMany({
            where: {
              employeeId: employee.id,
              shiftDate: { gte: tomorrowStart, lt: dayAfterTomorrow },
            },
            select: {
              id: true,
              shiftDate: true,
              shiftType: true,
              startTime: true,
              endTime: true,
            },
            orderBy: { id: "asc" },
            take: limit,
          }),
          prisma.activityLog.findMany({
            where: { action: "announcement.broadcast" },
            select: {
              id: true,
              summary: true,
              metadata: true,
              createdAt: true,
            },
            orderBy: { id: "desc" },
            take: 5,
          }),
        ]);

      for (const lr of leaves) {
        if (!lr.decidedAt) continue;
        const typeLabel = LEAVE_TYPE_LABEL[lr.type] ?? lr.type;
        const isApproved = lr.status === "approved";
        const isRejected = lr.status === "rejected";
        const severity: NotifSeverity = isApproved
          ? "success"
          : isRejected
            ? "destructive"
            : "info";
        const statusVi = isApproved
          ? "đã được duyệt"
          : isRejected
            ? "bị từ chối"
            : "đã có quyết định";
        items.push({
          type: "leave-decided",
          at: lr.decidedAt.toISOString(),
          title: `Đơn ${typeLabel} ${statusVi}`,
          detail: `Từ ${fmtDate(lr.startDate)} đến ${fmtDate(lr.endDate)}`,
          href: `/leaves`,
          severity,
          icon: "plane",
        });
      }

      for (const k of kudos) {
        const fromName = readMetaString(k.metadata, "fromName");
        const message = readMetaString(k.metadata, "message");
        items.push({
          type: "kudos-received",
          at: k.createdAt.toISOString(),
          title: "Bạn nhận được lời khen",
          detail:
            message ??
            (fromName ? `Từ ${fromName}` : k.summary || "Có người khen bạn"),
          href: `/employees/${employee.id}`,
          severity: "success",
          icon: "heart",
        });
      }

      for (const t of overdueTasks) {
        if (!t.dueDate) continue;
        items.push({
          type: "task-overdue",
          at: t.dueDate.toISOString(),
          title: `Công việc quá hạn: ${t.title}`,
          detail: `Hạn ${fmtDate(t.dueDate)} (ưu tiên ${t.priority})`,
          href: `/tasks`,
          severity: "warning",
          icon: "list-checks",
        });
      }

      for (const s of tomorrowShifts) {
        const range =
          s.startTime && s.endTime
            ? `${s.startTime}–${s.endTime}`
            : s.shiftType ?? "ca làm";
        items.push({
          type: "shift-tomorrow",
          at: s.shiftDate.toISOString(),
          title: "Ca làm ngày mai",
          detail: `${range} (${fmtDate(s.shiftDate)})`,
          href: `/shifts`,
          severity: "info",
          icon: "calendar-clock",
        });
      }

      for (const a of announcements) {
        const message = readMetaString(a.metadata, "message") ?? a.summary;
        items.push({
          type: "announcement",
          at: a.createdAt.toISOString(),
          title: "Thông báo mới",
          detail: message,
          href: `/announcements`,
          severity: "info",
          icon: "megaphone",
        });
      }
    } else {
      const announcements = await prisma.activityLog.findMany({
        where: { action: "announcement.broadcast" },
        select: {
          id: true,
          summary: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { id: "desc" },
        take: 5,
      });

      for (const a of announcements) {
        const message = readMetaString(a.metadata, "message") ?? a.summary;
        items.push({
          type: "announcement",
          at: a.createdAt.toISOString(),
          title: "Thông báo mới",
          detail: message,
          href: `/announcements`,
          severity: "info",
          icon: "megaphone",
        });
      }
    }

    items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const sliced = items.slice(0, limit);

    const sevenDaysAgoIso = sevenDaysAgo.toISOString();
    const unread = sliced.reduce((acc, it) => {
      if (UNREAD_TYPES.has(it.type) && it.at >= sevenDaysAgoIso) {
        return acc + 1;
      }
      return acc;
    }, 0);

    return NextResponse.json({
      ok: true,
      asOf: now.toISOString(),
      unread,
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
