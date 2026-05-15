import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WeekBucket = {
  weekStartIso: string;
  weekEndIso: string;
  label: string;
  totalHours: number;
  totalCheckins: number;
  avgHoursPerCheckin: number;
  uniqueEmployees: number;
  kudos: number;
  tasksCompleted: number;
  leavesApproved: number;
  lateCheckouts: number;
  wellnessIndex: number;
};

type WellnessTrendResponse = {
  ok: true;
  generatedAt: string;
  windowWeeks: number;
  weeks: WeekBucket[];
  sparklines: {
    hours: number[];
    kudos: number[];
    tasks: number[];
    wellnessIndex: number[];
    leaves: number[];
  };
  latest: WeekBucket | null;
  deltas: {
    hoursVsPrior: number;
    kudosVsPrior: number;
    tasksVsPrior: number;
    wellnessVsPrior: number;
  };
  insights: string[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const mondayOffset = (day + 6) % 7;
  const r = new Date(d);
  r.setDate(r.getDate() - mondayOffset);
  return startOfDay(r);
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

function fmtVnShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeWellness(b: Omit<WeekBucket, "wellnessIndex" | "label">): number {
  let score = 50;
  if (b.uniqueEmployees > 0) {
    const hoursPerEmployee = b.totalHours / b.uniqueEmployees;
    if (hoursPerEmployee >= 25 && hoursPerEmployee <= 45) score += 15;
    else if (hoursPerEmployee > 55) score -= 15;
    else if (hoursPerEmployee < 15) score -= 5;
  }
  if (b.kudos >= b.uniqueEmployees && b.uniqueEmployees > 0) score += 15;
  else if (b.kudos === 0 && b.uniqueEmployees > 0) score -= 5;
  if (b.tasksCompleted >= 5) score += 10;
  if (b.leavesApproved > 0) score += 5;
  if (b.lateCheckouts > b.uniqueEmployees * 2) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const weeksRaw = Number(url.searchParams.get("weeks") ?? "8");
  const windowWeeks = Number.isFinite(weeksRaw)
    ? clamp(Math.floor(weeksRaw), 2, 26)
    : 8;

  const now = new Date();
  const today = startOfDay(now);
  const currentWeekStart = startOfWeekMonday(today);
  const windowStart = addDays(currentWeekStart, -(windowWeeks - 1) * 7);
  const windowEndExclusive = addDays(currentWeekStart, 7);

  try {
    const [attendance, kudos, tasks, leaves] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          checkIn: { gte: windowStart, lt: windowEndExclusive },
        },
        select: {
          employeeId: true,
          checkIn: true,
          checkOut: true,
          hoursWorked: true,
        },
      }),
      prisma.activityLog.findMany({
        where: {
          action: "kudos.give",
          entityType: "employee",
          createdAt: { gte: windowStart, lt: windowEndExclusive },
        },
        select: { createdAt: true },
      }),
      prisma.task.findMany({
        where: {
          completedAt: { gte: windowStart, lt: windowEndExclusive },
        },
        select: { completedAt: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "approved",
          startDate: { lt: windowEndExclusive },
          endDate: { gte: windowStart },
        },
        select: { startDate: true, endDate: true },
      }),
    ]);

    const weeks: WeekBucket[] = [];
    const weekIndex = new Map<string, WeekBucket>();
    const weekEmployees = new Map<string, Set<number>>();

    for (let i = 0; i < windowWeeks; i++) {
      const wStart = addDays(windowStart, i * 7);
      const wEnd = addDays(wStart, 6);
      const wStartIso = ymd(wStart);
      const bucket: WeekBucket = {
        weekStartIso: wStartIso,
        weekEndIso: ymd(wEnd),
        label: `${fmtVnShort(wStart)}–${fmtVnShort(wEnd)}`,
        totalHours: 0,
        totalCheckins: 0,
        avgHoursPerCheckin: 0,
        uniqueEmployees: 0,
        kudos: 0,
        tasksCompleted: 0,
        leavesApproved: 0,
        lateCheckouts: 0,
        wellnessIndex: 0,
      };
      weeks.push(bucket);
      weekIndex.set(wStartIso, bucket);
      weekEmployees.set(wStartIso, new Set());
    }

    function bucketKeyFor(d: Date): string | null {
      const dayStart = startOfDay(d);
      const wStart = startOfWeekMonday(dayStart);
      const key = ymd(wStart);
      return weekIndex.has(key) ? key : null;
    }

    for (const a of attendance) {
      const key = bucketKeyFor(a.checkIn);
      if (!key) continue;
      const bucket = weekIndex.get(key);
      const empSet = weekEmployees.get(key);
      if (!bucket || !empSet) continue;
      empSet.add(a.employeeId);
      bucket.totalCheckins += 1;
      const hours = a.hoursWorked ? Number(a.hoursWorked) : 0;
      bucket.totalHours += hours;
      if (a.checkOut && a.checkOut.getHours() >= 22) {
        bucket.lateCheckouts += 1;
      }
    }

    for (const k of kudos) {
      const key = bucketKeyFor(k.createdAt);
      if (!key) continue;
      const bucket = weekIndex.get(key);
      if (bucket) bucket.kudos += 1;
    }

    for (const t of tasks) {
      if (!t.completedAt) continue;
      const key = bucketKeyFor(t.completedAt);
      if (!key) continue;
      const bucket = weekIndex.get(key);
      if (bucket) bucket.tasksCompleted += 1;
    }

    for (const lv of leaves) {
      const startMs = startOfDay(lv.startDate).getTime();
      const endMs = startOfDay(lv.endDate).getTime();
      for (let ms = startMs; ms <= endMs; ms += 86_400_000) {
        const key = bucketKeyFor(new Date(ms));
        if (!key) continue;
        const bucket = weekIndex.get(key);
        if (bucket) bucket.leavesApproved += 1;
      }
    }

    for (const bucket of weeks) {
      const empSet = weekEmployees.get(bucket.weekStartIso);
      bucket.uniqueEmployees = empSet ? empSet.size : 0;
      bucket.avgHoursPerCheckin =
        bucket.totalCheckins > 0
          ? Math.round((bucket.totalHours / bucket.totalCheckins) * 10) / 10
          : 0;
      bucket.totalHours = Math.round(bucket.totalHours * 10) / 10;
      bucket.wellnessIndex = computeWellness(bucket);
    }

    const latest = weeks[weeks.length - 1] ?? null;
    const prior = weeks[weeks.length - 2] ?? null;

    const deltas = {
      hoursVsPrior:
        latest && prior
          ? Math.round((latest.totalHours - prior.totalHours) * 10) / 10
          : 0,
      kudosVsPrior: latest && prior ? latest.kudos - prior.kudos : 0,
      tasksVsPrior: latest && prior ? latest.tasksCompleted - prior.tasksCompleted : 0,
      wellnessVsPrior:
        latest && prior ? latest.wellnessIndex - prior.wellnessIndex : 0,
    };

    const insights: string[] = [];
    if (latest && prior) {
      if (latest.wellnessIndex > prior.wellnessIndex + 5) {
        insights.push(
          `Chỉ số sức khỏe tăng ${deltas.wellnessVsPrior} điểm so với tuần trước — đà tích cực.`,
        );
      } else if (latest.wellnessIndex < prior.wellnessIndex - 5) {
        insights.push(
          `Chỉ số sức khỏe giảm ${Math.abs(deltas.wellnessVsPrior)} điểm — cần lưu ý chăm sóc đội ngũ.`,
        );
      }
      if (deltas.kudosVsPrior >= 3) {
        insights.push(
          `Lượng lời khen tăng ${deltas.kudosVsPrior} so với tuần trước — văn hóa ghi nhận đang lan tỏa.`,
        );
      }
      if (latest.lateCheckouts > prior.lateCheckouts && latest.lateCheckouts > 0) {
        insights.push(
          `Số lần tan ca muộn tăng (${latest.lateCheckouts}) — kiểm tra phân ca tối.`,
        );
      }
      if (latest.uniqueEmployees > 0 && latest.kudos === 0) {
        insights.push(
          "Tuần này chưa có lời khen nào được ghi nhận — khuyến khích trao kudos.",
        );
      }
      if (
        latest.uniqueEmployees > 0 &&
        latest.totalHours / latest.uniqueEmployees > 50
      ) {
        insights.push(
          `Trung bình ${Math.round((latest.totalHours / latest.uniqueEmployees) * 10) / 10} giờ/người — vùng nguy cơ kiệt sức.`,
        );
      }
    }
    if (insights.length === 0) {
      insights.push("Chưa có thay đổi đáng kể giữa các tuần — đội ngũ ổn định.");
    }

    const sparklines = {
      hours: weeks.map((w) => w.totalHours),
      kudos: weeks.map((w) => w.kudos),
      tasks: weeks.map((w) => w.tasksCompleted),
      wellnessIndex: weeks.map((w) => w.wellnessIndex),
      leaves: weeks.map((w) => w.leavesApproved),
    };

    const response: WellnessTrendResponse = {
      ok: true,
      generatedAt: now.toISOString(),
      windowWeeks,
      weeks,
      sparklines,
      latest,
      deltas,
      insights,
    };

    return NextResponse.json(response, {
      headers: { "cache-control": "private, max-age=600, s-maxage=600" },
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
