import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LeaveTypeKey = "annual" | "sick" | "unpaid" | "other";

type MonthBucket = {
  ym: string;
  year: number;
  month: number;
  label: string;
  total: number;
  byType: Record<LeaveTypeKey, number>;
  requests: number;
};

const MONTH_LABELS_VI = [
  "Th01", "Th02", "Th03", "Th04", "Th05", "Th06",
  "Th07", "Th08", "Th09", "Th10", "Th11", "Th12",
];

function ymKey(year: number, monthIdx0: number): string {
  return `${year}-${String(monthIdx0 + 1).padStart(2, "0")}`;
}

function startOfMonth(year: number, monthIdx0: number): Date {
  return new Date(year, monthIdx0, 1, 0, 0, 0, 0);
}

function endOfMonthExclusive(year: number, monthIdx0: number): Date {
  return new Date(year, monthIdx0 + 1, 1, 0, 0, 0, 0);
}

function daysInRange(startInclusive: Date, endExclusive: Date): number {
  const ms = endExclusive.getTime() - startInclusive.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
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
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const buckets: MonthBucket[] = [];
  const bucketIndex = new Map<string, MonthBucket>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = ymKey(y, m);
    const bucket: MonthBucket = {
      ym: key,
      year: y,
      month: m + 1,
      label: `${MONTH_LABELS_VI[m]}/${String(y).slice(2)}`,
      total: 0,
      byType: { annual: 0, sick: 0, unpaid: 0, other: 0 },
      requests: 0,
    };
    buckets.push(bucket);
    bucketIndex.set(key, bucket);
  }

  const windowStart = startOfMonth(buckets[0].year, buckets[0].month - 1);
  const windowEndExclusive = endOfMonthExclusive(
    buckets[buckets.length - 1].year,
    buckets[buckets.length - 1].month - 1,
  );

  try {
    const rows = await prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lt: windowEndExclusive },
        endDate: { gte: windowStart },
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
      },
    });

    let totalDaysAll = 0;
    let totalRequestsAll = 0;
    const byType: Record<LeaveTypeKey, number> = {
      annual: 0,
      sick: 0,
      unpaid: 0,
      other: 0,
    };

    for (const r of rows) {
      totalRequestsAll += 1;
      const t = r.type as LeaveTypeKey;
      // Walk month-by-month, slicing overlap with each bucket.
      for (const b of buckets) {
        const bStart = startOfMonth(b.year, b.month - 1);
        const bEndExcl = endOfMonthExclusive(b.year, b.month - 1);
        const overlapStart = r.startDate > bStart ? r.startDate : bStart;
        const overlapEndExcl =
          // endDate is inclusive day; add one day to make exclusive
          new Date(r.endDate.getTime() + 86_400_000) < bEndExcl
            ? new Date(r.endDate.getTime() + 86_400_000)
            : bEndExcl;
        const days = daysInRange(overlapStart, overlapEndExcl);
        if (days <= 0) continue;
        b.total += days;
        b.byType[t] += days;
        b.requests += 1;
        totalDaysAll += days;
        byType[t] += days;
      }
    }

    const maxMonthly = buckets.reduce((m, b) => Math.max(m, b.total), 0);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: now.toISOString(),
        windowStart: windowStart.toISOString().slice(0, 10),
        windowEnd: new Date(windowEndExclusive.getTime() - 86_400_000)
          .toISOString()
          .slice(0, 10),
        totals: {
          days: totalDaysAll,
          requests: totalRequestsAll,
          byType,
          peakMonthDays: maxMonthly,
        },
        months: buckets,
      },
      {
        headers: {
          "cache-control": "private, max-age=300, s-maxage=300",
        },
      },
    );
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
