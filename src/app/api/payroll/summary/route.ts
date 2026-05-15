import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MonthBucket = {
  ym: string;
  year: number;
  month: number;
  label: string;
  totalCost: number;
  totalHours: number;
  entries: number;
  paid: number;
  pending: number;
  averageNetPay: number;
};

type LatestPeriodSummary = {
  ym: string;
  label: string;
  totalCost: number;
  entries: number;
  averageNetPay: number;
} | null;

const MONTH_LABELS_VI = [
  "Th01", "Th02", "Th03", "Th04", "Th05", "Th06",
  "Th07", "Th08", "Th09", "Th10", "Th11", "Th12",
];

function ymKey(year: number, monthIdx0: number): string {
  return `${year}-${String(monthIdx0 + 1).padStart(2, "0")}`;
}

function clampMonths(raw: string | null): number {
  if (!raw) return 6;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 6;
  if (n < 1) return 1;
  if (n > 24) return 24;
  return n;
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
  const months = clampMonths(url.searchParams.get("months"));

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const buckets: MonthBucket[] = [];
  const bucketIndex = new Map<string, MonthBucket>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = ymKey(y, m);
    const bucket: MonthBucket = {
      ym: key,
      year: y,
      month: m + 1,
      label: `${MONTH_LABELS_VI[m]}/${String(y).slice(2)}`,
      totalCost: 0,
      totalHours: 0,
      entries: 0,
      paid: 0,
      pending: 0,
      averageNetPay: 0,
    };
    buckets.push(bucket);
    bucketIndex.set(key, bucket);
  }

  const periods = buckets.map((b) => b.ym);

  try {
    const rows = await prisma.payroll.findMany({
      where: { period: { in: periods } },
      select: {
        period: true,
        totalHours: true,
        totalPay: true,
        generatedAt: true,
      },
    });

    let grandTotalCost = 0;
    let grandEntries = 0;
    let grandPaid = 0;
    let grandPending = 0;

    for (const r of rows) {
      const bucket = bucketIndex.get(r.period);
      if (!bucket) continue;
      const pay = Number(r.totalPay);
      const hours = Number(r.totalHours);
      bucket.totalCost += pay;
      bucket.totalHours += hours;
      bucket.entries += 1;
      // Schema has no status/paidAt — treat entries with generatedAt as paid.
      if (r.generatedAt) {
        bucket.paid += 1;
        grandPaid += 1;
      } else {
        bucket.pending += 1;
        grandPending += 1;
      }
      grandTotalCost += pay;
      grandEntries += 1;
    }

    for (const b of buckets) {
      b.averageNetPay = b.entries > 0 ? b.totalCost / b.entries : 0;
    }

    let latest: LatestPeriodSummary = null;
    for (let i = buckets.length - 1; i >= 0; i--) {
      const b = buckets[i];
      if (b.entries > 0) {
        latest = {
          ym: b.ym,
          label: b.label,
          totalCost: b.totalCost,
          entries: b.entries,
          averageNetPay: b.averageNetPay,
        };
        break;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        generatedAt: now.toISOString(),
        windowMonths: months,
        totals: {
          grandTotalCost,
          entries: grandEntries,
          paid: grandPaid,
          pending: grandPending,
          averageNetPay: grandEntries > 0 ? grandTotalCost / grandEntries : 0,
          latestPeriod: latest,
        },
        months: buckets,
      },
      {
        headers: {
          "cache-control": "private, max-age=600, s-maxage=600",
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
