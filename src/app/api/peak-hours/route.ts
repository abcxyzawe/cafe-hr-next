import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Level = "hot" | "warm" | "cool" | "empty";

type HourBucket = {
  hour: number;
  count: number;
  avgPerDay: number;
  level: Level;
};

type TopPeak = {
  hour: number;
  count: number;
  label: string;
};

type WeekdayBreakdown = {
  weekday: number;
  label: string;
  totalCheckins: number;
  dominantHour: number | null;
};

type PeakHoursResponse = {
  ok: true;
  generatedAt: string;
  windowDays: number;
  hourBuckets: HourBucket[];
  topPeaks: TopPeak[];
  quietDaytimeHours: number[];
  weekdayBreakdown: WeekdayBreakdown[];
  recommendedOpenHour: number | null;
  totalCheckins: number;
  avgLatenessMinutes: number;
  notes: string[];
};

// 0 = Sunday .. 6 = Saturday (JS Date.getDay convention).
// Vietnamese labels: T2 (Monday) .. CN (Sunday).
const WEEKDAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

function clampDays(raw: string | null): number {
  if (!raw) return 30;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 30;
  if (n < 7) return 7;
  if (n > 90) return 90;
  return n;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function hourLabel(h: number): string {
  const next = (h + 1) % 24;
  return `${pad2(h)}:00\u2013${pad2(next)}:00`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function levelFor(avgPerDay: number, maxAvg: number): Level {
  if (avgPerDay <= 0) return "empty";
  if (maxAvg <= 0) return "empty";
  const ratio = avgPerDay / maxAvg;
  if (ratio >= 0.7) return "hot";
  if (ratio >= 0.4) return "warm";
  return "cool";
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
}

export async function GET(req: NextRequest) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const windowDays = clampDays(url.searchParams.get("days"));

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));

  try {
    const rows = await prisma.attendance.findMany({
      where: { checkIn: { gte: windowStart, lt: tomorrow } },
      select: { employeeId: true, checkIn: true },
    });

    // Hour-of-day counts and per-weekday counts.
    const hourCounts: number[] = new Array<number>(24).fill(0);
    const weekdayTotals: number[] = new Array<number>(7).fill(0);
    const weekdayHourCounts: number[][] = Array.from(
      { length: 7 },
      () => new Array<number>(24).fill(0),
    );

    // For lateness: collect first check-in (in minutes since local midnight) per
    // employee per day.
    const firstByEmpDay = new Map<string, number>();
    for (const r of rows) {
      const ci = r.checkIn;
      const hour = ci.getHours();
      const wd = ci.getDay();
      const minutes = hour * 60 + ci.getMinutes();
      hourCounts[hour] += 1;
      weekdayTotals[wd] += 1;
      weekdayHourCounts[wd][hour] += 1;

      const dayKey = ymd(ci);
      const empDayKey = `${r.employeeId}|${dayKey}`;
      const prev = firstByEmpDay.get(empDayKey);
      if (prev === undefined || minutes < prev) {
        firstByEmpDay.set(empDayKey, minutes);
      }
    }

    const totalCheckins = rows.length;

    // Per-hour averages and levels.
    let maxAvg = 0;
    const avgPerDayArr: number[] = new Array<number>(24).fill(0);
    for (let h = 0; h < 24; h++) {
      const avg = hourCounts[h] / windowDays;
      avgPerDayArr[h] = avg;
      if (avg > maxAvg) maxAvg = avg;
    }

    const hourBuckets: HourBucket[] = [];
    for (let h = 0; h < 24; h++) {
      hourBuckets.push({
        hour: h,
        count: hourCounts[h],
        avgPerDay: round2(avgPerDayArr[h]),
        level: levelFor(avgPerDayArr[h], maxAvg),
      });
    }

    // Top 3 peak hours (by raw count; ties broken by earlier hour).
    const peakOrder = hourBuckets
      .map((b) => ({ hour: b.hour, count: b.count }))
      .filter((b) => b.count > 0)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.hour - b.hour;
      })
      .slice(0, 3);
    const topPeaks: TopPeak[] = peakOrder.map((p) => ({
      hour: p.hour,
      count: p.count,
      label: hourLabel(p.hour),
    }));

    // Quiet daytime hours: hours in 6..21 (inclusive) where avg < 1/day.
    const quietDaytimeHours: number[] = [];
    for (let h = 6; h <= 21; h++) {
      if (avgPerDayArr[h] < 1) quietDaytimeHours.push(h);
    }

    // Weekday breakdown with dominant hour per weekday.
    const weekdayBreakdown: WeekdayBreakdown[] = [];
    for (let wd = 0; wd < 7; wd++) {
      const arr = weekdayHourCounts[wd];
      let domHour: number | null = null;
      let domCount = 0;
      for (let h = 0; h < 24; h++) {
        if (arr[h] > domCount) {
          domCount = arr[h];
          domHour = h;
        }
      }
      weekdayBreakdown.push({
        weekday: wd,
        label: WEEKDAY_LABELS[wd] ?? String(wd),
        totalCheckins: weekdayTotals[wd],
        dominantHour: domHour,
      });
    }

    // Recommended opening hour: earliest hour where avgPerDay >= 0.5.
    let recommendedOpenHour: number | null = null;
    for (let h = 0; h < 24; h++) {
      if (avgPerDayArr[h] >= 0.5) {
        recommendedOpenHour = h;
        break;
      }
    }

    // Lateness: median of first-checkin minutes across all (emp,day) rows is
    // treated as the "typical start-of-shift". Lateness = avg minutes by which
    // late-arrivers exceed that median.
    let avgLatenessMinutes = 0;
    if (firstByEmpDay.size > 0) {
      const firsts: number[] = Array.from(firstByEmpDay.values()).sort(
        (a, b) => a - b,
      );
      const mid = Math.floor(firsts.length / 2);
      const median =
        firsts.length % 2 === 0
          ? (firsts[mid - 1] + firsts[mid]) / 2
          : firsts[mid];
      let lateSum = 0;
      let lateCount = 0;
      for (const v of firsts) {
        if (v > median) {
          lateSum += v - median;
          lateCount += 1;
        }
      }
      avgLatenessMinutes =
        lateCount > 0 ? Math.round((lateSum / lateCount) * 10) / 10 : 0;
    }

    // Vietnamese insight notes.
    const notes: string[] = [];
    notes.push(
      `Phân tích ${totalCheckins} lượt check-in trong ${windowDays} ngày gần đây.`,
    );
    if (topPeaks.length > 0) {
      const p0 = topPeaks[0];
      notes.push(
        `Khung giờ đông nhất: ${p0.label} (${p0.count} lượt, ~${round1(
          p0.count / windowDays,
        )} lượt/ngày).`,
      );
    } else {
      notes.push("Không có dữ liệu check-in trong khoảng thời gian này.");
    }
    if (topPeaks.length >= 2) {
      const labels = topPeaks.map((p) => p.label).join(", ");
      notes.push(`Top 3 khung giờ cao điểm: ${labels}.`);
    }
    if (recommendedOpenHour !== null) {
      notes.push(
        `Gợi ý giờ mở cửa: ${pad2(recommendedOpenHour)}:00 (mốc đầu tiên đạt ≥0.5 lượt/ngày).`,
      );
    } else {
      notes.push("Chưa có khung giờ nào đạt ngưỡng 0.5 lượt/ngày để gợi ý giờ mở cửa.");
    }
    if (quietDaytimeHours.length > 0) {
      const qs = quietDaytimeHours.map((h) => `${pad2(h)}:00`).join(", ");
      notes.push(`Khung giờ ban ngày vắng (avg <1 lượt/ngày): ${qs}.`);
    }
    // Busiest weekday.
    let busyWd = -1;
    let busyWdCount = -1;
    for (const w of weekdayBreakdown) {
      if (w.totalCheckins > busyWdCount) {
        busyWdCount = w.totalCheckins;
        busyWd = w.weekday;
      }
    }
    if (busyWd >= 0 && busyWdCount > 0) {
      const w = weekdayBreakdown[busyWd];
      const domLabel =
        w.dominantHour !== null ? ` (đỉnh điểm ${pad2(w.dominantHour)}:00)` : "";
      notes.push(
        `Ngày bận rộn nhất trong tuần: ${w.label} với ${w.totalCheckins} lượt${domLabel}.`,
      );
    }
    if (avgLatenessMinutes > 0) {
      notes.push(
        `Trung bình nhân viên đến trễ ${avgLatenessMinutes} phút so với mốc check-in điển hình.`,
      );
    }

    const body: PeakHoursResponse = {
      ok: true,
      generatedAt: now.toISOString(),
      windowDays,
      hourBuckets,
      topPeaks,
      quietDaytimeHours,
      weekdayBreakdown,
      recommendedOpenHour,
      totalCheckins,
      avgLatenessMinutes,
      notes,
    };

    return NextResponse.json(body, {
      headers: {
        "cache-control": "private, max-age=600",
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
