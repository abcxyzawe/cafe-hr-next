import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnniversaryItem = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  hiredIso: string;
  yearsCompleting: number;
  nextAnniversaryIso: string;
  daysUntil: number;
  milestone: boolean;
  badgeLabel: string;
  monthsTenure: number;
};

const MILESTONE_YEARS = new Set([1, 2, 3, 5, 7, 10, 15, 20, 25]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextAnniversary(
  hireDate: Date,
  today: Date,
): { date: Date; yearsCompleting: number } {
  const month = hireDate.getMonth();
  const day = hireDate.getDate();
  const todayYear = today.getFullYear();

  let candidate = new Date(todayYear, month, day, 0, 0, 0, 0);
  if (candidate < today) {
    candidate = new Date(todayYear + 1, month, day, 0, 0, 0, 0);
  }
  const yearsCompleting = candidate.getFullYear() - hireDate.getFullYear();
  return { date: candidate, yearsCompleting };
}

function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12;
  months += to.getMonth() - from.getMonth();
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function badgeFor(years: number): string {
  if (years >= 20) return "Huyền thoại";
  if (years >= 15) return "Trụ cột";
  if (years >= 10) return "Thập niên";
  if (years >= 7) return "Lâu năm";
  if (years >= 5) return "Nửa thập kỷ";
  if (years >= 3) return "Bền bỉ";
  if (years >= 2) return "Vững vàng";
  if (years >= 1) return "Tròn năm";
  return "Tân binh";
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const daysRaw = Number(url.searchParams.get("days") ?? "60");
  const days = Number.isFinite(daysRaw) ? clamp(Math.floor(daysRaw), 1, 365) : 60;

  const now = new Date();
  const today = startOfDay(now);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + days);

  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    const upcoming: AnniversaryItem[] = [];
    let milestoneCount = 0;

    for (const e of employees) {
      const hireDate = startOfDay(e.createdAt);
      const { date: nextDate, yearsCompleting } = nextAnniversary(
        hireDate,
        today,
      );
      const daysUntil = Math.round(
        (nextDate.getTime() - today.getTime()) / 86_400_000,
      );
      if (daysUntil < 0 || daysUntil > days) continue;
      if (yearsCompleting < 1) continue;

      const milestone = MILESTONE_YEARS.has(yearsCompleting);
      if (milestone) milestoneCount += 1;

      upcoming.push({
        id: e.id,
        name: e.name,
        role: e.role,
        avatarUrl: e.avatarUrl,
        hiredIso: ymd(hireDate),
        yearsCompleting,
        nextAnniversaryIso: ymd(nextDate),
        daysUntil,
        milestone,
        badgeLabel: badgeFor(yearsCompleting),
        monthsTenure: monthsBetween(hireDate, today),
      });
    }

    upcoming.sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return b.yearsCompleting - a.yearsCompleting;
    });

    const totalTenureMonths = employees.reduce(
      (sum, e) => sum + monthsBetween(startOfDay(e.createdAt), today),
      0,
    );
    const avgTenureMonths =
      employees.length > 0
        ? Math.round((totalTenureMonths / employees.length) * 10) / 10
        : 0;

    return NextResponse.json(
      {
        ok: true,
        generatedAt: now.toISOString(),
        windowDays: days,
        windowStartIso: ymd(today),
        windowEndIso: ymd(horizon),
        summary: {
          totalEmployees: employees.length,
          upcomingCount: upcoming.length,
          milestoneCount,
          averageTenureMonths: avgTenureMonths,
        },
        next: upcoming[0] ?? null,
        items: upcoming,
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
