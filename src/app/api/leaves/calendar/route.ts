import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { VN_HOLIDAYS_2025_2027 } from "@/lib/holidays";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LeaveTypeKey = "annual" | "sick" | "personal" | "unpaid";

type DayLeave = {
  id: number;
  employeeId: number;
  employeeName: string;
  role: string;
  type: LeaveTypeKey;
  status: "approved";
  isStart: boolean;
  isEnd: boolean;
  isContinuation: boolean;
};

type DayCell = {
  iso: string;
  weekday: number; // 0..6 Mon-based: 0=Mon, 6=Sun
  dayOfMonth: number;
  inTargetMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
  leaves: DayLeave[];
  count: number;
  isVietHoliday: boolean;
  holidayName?: string;
};

type Summary = {
  totalApprovedDays: number;
  byType: Record<LeaveTypeKey, number>;
  peakDay: { iso: string; count: number } | null;
  coverageWarnings: string[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseTargetMonth(raw: string | null, now: Date): { year: number; monthIdx0: number; ym: string } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [yStr, mStr] = raw.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12 && y >= 1970 && y <= 9999) {
      return { year: y, monthIdx0: m - 1, ym: `${y}-${pad2(m)}` };
    }
  }
  const y = now.getFullYear();
  const m0 = now.getMonth();
  return { year: y, monthIdx0: m0, ym: `${y}-${pad2(m0 + 1)}` };
}

function parseWeeks(raw: string | null): number {
  if (!raw) return 6;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 6;
  return clamp(Math.floor(n), 4, 12);
}

// Compute Monday of the week that contains the first day of the target month.
// weekday: JS getDay() Sun=0..Sat=6 -> Mon-based offset 0..6.
function mondayOffset(jsDay: number): number {
  // jsDay: 0=Sun..6=Sat -> Mon-based: Mon=0, Tue=1, ... Sun=6
  return (jsDay + 6) % 7;
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const now = new Date();
  const url = new URL(req.url);
  const { year, monthIdx0, ym } = parseTargetMonth(
    url.searchParams.get("month"),
    now,
  );
  const weeks = parseWeeks(url.searchParams.get("weeks"));

  const firstOfMonth = new Date(year, monthIdx0, 1, 0, 0, 0, 0);
  const monOffset = mondayOffset(firstOfMonth.getDay());
  const gridStart = new Date(year, monthIdx0, 1 - monOffset, 0, 0, 0, 0);
  const totalDays = weeks * 7;
  const gridEndExclusive = new Date(
    gridStart.getFullYear(),
    gridStart.getMonth(),
    gridStart.getDate() + totalDays,
    0,
    0,
    0,
    0,
  );
  // Inclusive end ISO (last cell of the grid)
  const gridLastCell = new Date(gridEndExclusive.getTime() - 86_400_000);

  const targetMonthStart = firstOfMonth;
  const targetMonthEndExclusive = new Date(year, monthIdx0 + 1, 1, 0, 0, 0, 0);

  const todayIso = toIsoLocal(now);

  try {
    const rows = await prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lt: gridEndExclusive },
        endDate: { gte: gridStart },
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        employee: { select: { id: true, name: true, role: true } },
      },
    });

    // Holiday lookup by ISO inside the grid range
    const holidayByIso = new Map<string, string>();
    for (const h of VN_HOLIDAYS_2025_2027) {
      if (h.iso >= toIsoLocal(gridStart) && h.iso <= toIsoLocal(gridLastCell)) {
        holidayByIso.set(h.iso, h.name);
      }
    }

    // Build day cells
    const days: DayCell[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i,
        0,
        0,
        0,
        0,
      );
      const iso = toIsoLocal(d);
      const weekday = mondayOffset(d.getDay()); // 0=Mon..6=Sun
      const inTargetMonth =
        d.getFullYear() === year && d.getMonth() === monthIdx0;
      const isWeekend = weekday === 5 || weekday === 6; // Sat or Sun
      const isToday = iso === todayIso;
      const isPast = iso < todayIso;
      const holidayName = holidayByIso.get(iso);

      days.push({
        iso,
        weekday,
        dayOfMonth: d.getDate(),
        inTargetMonth,
        isWeekend,
        isToday,
        isPast,
        leaves: [],
        count: 0,
        isVietHoliday: holidayName !== undefined,
        ...(holidayName !== undefined ? { holidayName } : {}),
      });
    }

    const dayIndexByIso = new Map<string, number>();
    days.forEach((c, idx) => dayIndexByIso.set(c.iso, idx));

    // Track unique leave requests touching the target month, per type
    const byType: Record<LeaveTypeKey, Set<number>> = {
      annual: new Set<number>(),
      sick: new Set<number>(),
      personal: new Set<number>(),
      unpaid: new Set<number>(),
    };

    // Assign leaves to day cells
    for (const r of rows) {
      const type = r.type as LeaveTypeKey;
      const startIso = toIsoLocal(r.startDate);
      const endIso = toIsoLocal(r.endDate);

      // Walk each day between startDate and endDate (inclusive) using ms math
      const startTs = new Date(
        r.startDate.getFullYear(),
        r.startDate.getMonth(),
        r.startDate.getDate(),
        0, 0, 0, 0,
      ).getTime();
      const endTs = new Date(
        r.endDate.getFullYear(),
        r.endDate.getMonth(),
        r.endDate.getDate(),
        0, 0, 0, 0,
      ).getTime();

      // Track whether this request touches the target month (for byType)
      let touchesTarget = false;

      for (let ts = startTs; ts <= endTs; ts += 86_400_000) {
        const cellDate = new Date(ts);
        const cellIso = toIsoLocal(cellDate);

        if (
          cellDate >= targetMonthStart &&
          cellDate < targetMonthEndExclusive
        ) {
          touchesTarget = true;
        }

        const idx = dayIndexByIso.get(cellIso);
        if (idx === undefined) continue;

        const isStart = cellIso === startIso;
        const isEnd = cellIso === endIso;
        const isContinuation = !isStart && !isEnd;

        days[idx].leaves.push({
          id: r.id,
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          role: r.employee.role,
          type,
          status: "approved",
          isStart,
          isEnd,
          isContinuation,
        });
        days[idx].count += 1;
      }

      if (touchesTarget) {
        byType[type].add(r.id);
      }
    }

    // Summary calculations (over target-month cells only)
    let totalApprovedDays = 0;
    let peakDay: { iso: string; count: number } | null = null;
    const coverageWarnings: string[] = [];

    for (const c of days) {
      if (c.inTargetMonth) {
        totalApprovedDays += c.count;
        if (peakDay === null || c.count > peakDay.count) {
          peakDay = { iso: c.iso, count: c.count };
        }
      }
      if (c.count >= 3) {
        coverageWarnings.push(
          `Ngày ${c.iso} có ${c.count} nhân viên nghỉ — cần bố trí ca thay thế.`,
        );
      }
    }
    if (peakDay !== null && peakDay.count === 0) {
      peakDay = null;
    }

    const summary: Summary = {
      totalApprovedDays,
      byType: {
        annual: byType.annual.size,
        sick: byType.sick.size,
        personal: byType.personal.size,
        unpaid: byType.unpaid.size,
      },
      peakDay,
      coverageWarnings,
    };

    return NextResponse.json(
      {
        ok: true,
        generatedAt: now.toISOString(),
        targetMonth: ym,
        gridStartIso: toIsoLocal(gridStart),
        gridEndIso: toIsoLocal(gridLastCell),
        weeks,
        summary,
        days,
      },
      {
        headers: {
          "cache-control": "private, max-age=300",
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
