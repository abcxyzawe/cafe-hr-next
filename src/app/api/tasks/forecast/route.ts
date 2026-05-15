import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ForecastStatus = "overdue" | "at_risk" | "on_track" | "no_due_date";
type Confidence = "high" | "medium" | "low";

type AssigneeRef = {
  id: number;
  name: string;
  role: string;
};

type AssigneeVelocity = {
  completed60d: number;
  avgDaysToComplete: number | null;
  hasLowCadence: boolean;
};

type ForecastItem = {
  id: number;
  title: string;
  assignee: AssigneeRef | null;
  dueDateIso: string | null;
  daysToDue: number | null;
  status: ForecastStatus;
  confidence: Confidence;
  priority: string;
  assigneeVelocity: AssigneeVelocity;
  etaIso: string | null;
  recommendationVi: string;
};

type ForecastResponse = {
  ok: true;
  generatedAt: string;
  summary: {
    totalOpen: number;
    overdue: number;
    atRisk: number;
    onTrack: number;
    noDueDate: number;
    healthScore: number;
  };
  items: ForecastItem[];
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function recommendationFor(status: ForecastStatus): string {
  if (status === "overdue") {
    return "Cần xem xét giao lại hoặc tăng hỗ trợ, nhiệm vụ đã quá hạn.";
  }
  if (status === "at_risk") {
    return "Có nguy cơ trễ hạn: cân nhắc hỗ trợ thêm, điều chỉnh hạn hoặc giảm tải.";
  }
  if (status === "no_due_date") {
    return "Thiếu hạn hoàn thành: cần đặt hạn cụ thể để theo dõi tiến độ.";
  }
  return "Đang đúng tiến độ: duy trì nhịp làm việc hiện tại.";
}

function confidenceFor(sample: number): Confidence {
  if (sample >= 5) return "high";
  if (sample >= 2) return "medium";
  return "low";
}

function statusRank(s: ForecastStatus): number {
  if (s === "overdue") return 0;
  if (s === "at_risk") return 1;
  if (s === "on_track") return 2;
  return 3;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
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
  const tomorrow = addDays(today, 1);
  const last60Start = addDays(today, -59);

  try {
    const [openTasks, completedRecent] = await Promise.all([
      prisma.task.findMany({
        where: { completedAt: null },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          assigneeId: true,
          assignee: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.task.findMany({
        where: {
          completedAt: { not: null, gte: last60Start, lt: tomorrow },
        },
        select: {
          assigneeId: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    type VelocityAcc = { count: number; totalDays: number };
    const velocityByAssignee = new Map<number, VelocityAcc>();
    for (const t of completedRecent) {
      if (!t.completedAt) continue;
      const days = Math.max(
        0,
        diffDays(startOfDay(t.completedAt), startOfDay(t.createdAt)),
      );
      const acc = velocityByAssignee.get(t.assigneeId);
      if (acc) {
        acc.count += 1;
        acc.totalDays += days;
      } else {
        velocityByAssignee.set(t.assigneeId, { count: 1, totalDays: days });
      }
    }

    const items: ForecastItem[] = [];

    for (const task of openTasks) {
      const acc = velocityByAssignee.get(task.assigneeId);
      const completed60d = acc?.count ?? 0;
      const avgDaysToComplete =
        acc && acc.count > 0
          ? Math.round((acc.totalDays / acc.count) * 10) / 10
          : null;
      const hasLowCadence =
        (avgDaysToComplete !== null && avgDaysToComplete > 5) ||
        completed60d < 2;

      const dueDate = task.dueDate ? startOfDay(task.dueDate) : null;
      const daysToDue = dueDate ? diffDays(dueDate, today) : null;

      let status: ForecastStatus;
      if (!dueDate) {
        status = "no_due_date";
      } else if (dueDate.getTime() < today.getTime()) {
        status = "overdue";
      } else {
        const velocityDaysCeil = Math.ceil(avgDaysToComplete ?? 0);
        const riskThreshold = addDays(today, velocityDaysCeil);
        if (
          dueDate.getTime() <= riskThreshold.getTime() &&
          hasLowCadence
        ) {
          status = "at_risk";
        } else {
          status = "on_track";
        }
      }

      let etaIso: string | null = null;
      if (avgDaysToComplete !== null) {
        const etaDays = Math.min(60, Math.ceil(avgDaysToComplete));
        etaIso = addDays(today, etaDays).toISOString();
      }

      items.push({
        id: task.id,
        title: task.title,
        assignee: task.assignee
          ? {
              id: task.assignee.id,
              name: task.assignee.name,
              role: task.assignee.role,
            }
          : null,
        dueDateIso: dueDate ? dueDate.toISOString() : null,
        daysToDue,
        status,
        confidence: confidenceFor(completed60d),
        priority: task.priority,
        assigneeVelocity: {
          completed60d,
          avgDaysToComplete,
          hasLowCadence,
        },
        etaIso,
        recommendationVi: recommendationFor(status),
      });
    }

    items.sort((a, b) => {
      const sr = statusRank(a.status) - statusRank(b.status);
      if (sr !== 0) return sr;
      const ad = a.daysToDue;
      const bd = b.daysToDue;
      if (ad === null && bd === null) return a.id - b.id;
      if (ad === null) return 1;
      if (bd === null) return -1;
      if (ad !== bd) return ad - bd;
      return a.id - b.id;
    });

    let overdue = 0;
    let atRisk = 0;
    let onTrack = 0;
    let noDueDate = 0;
    for (const it of items) {
      if (it.status === "overdue") overdue += 1;
      else if (it.status === "at_risk") atRisk += 1;
      else if (it.status === "on_track") onTrack += 1;
      else noDueDate += 1;
    }

    const rawHealth = 100 - (overdue * 5 + atRisk * 2);
    const healthScore = Math.max(0, Math.min(100, rawHealth));

    const body: ForecastResponse = {
      ok: true,
      generatedAt: now.toISOString(),
      summary: {
        totalOpen: items.length,
        overdue,
        atRisk,
        onTrack,
        noDueDate,
        healthScore,
      },
      items,
    };

    return NextResponse.json(body, {
      headers: {
        "cache-control": "private, max-age=120",
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
