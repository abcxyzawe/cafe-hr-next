import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Period = "week" | "month" | "quarter" | "year";

type CategoryKey =
  | "mostKudos"
  | "mostHours"
  | "mostTasksCompleted"
  | "bestShiftAttendance"
  | "longestStreak"
  | "mostShiftCoverage";

type EmployeeRef = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type Row = {
  rank: number;
  employee: EmployeeRef;
  value: number;
  displayValue: string;
  secondary?: string;
};

type Champion = {
  id: number;
  name: string;
  role: string;
  titles: string[];
};

type LeaderboardsResponse = {
  ok: true;
  generatedAt: string;
  period: Period;
  periodStartIso: string;
  periodEndIso: string;
  champion: Champion | null;
  categories: Record<CategoryKey, Row[]>;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function parsePeriod(raw: string | null): Period {
  if (raw === "week" || raw === "month" || raw === "quarter" || raw === "year") {
    return raw;
  }
  return "month";
}

function periodStart(now: Date, period: Period): Date {
  const today = startOfDay(now);
  if (period === "week") return addDays(today, -6);
  if (period === "month") return addDays(today, -29);
  if (period === "quarter") return addDays(today, -89);
  return addDays(today, -364);
}

function categoryTitleVi(key: CategoryKey): string {
  switch (key) {
    case "mostKudos":
      return "Nhiều lời khen nhất";
    case "mostHours":
      return "Nhiều giờ làm nhất";
    case "mostTasksCompleted":
      return "Hoàn thành nhiều việc nhất";
    case "bestShiftAttendance":
      return "Chuyên cần ca làm tốt nhất";
    case "longestStreak":
      return "Chuỗi ngày làm dài nhất";
    case "mostShiftCoverage":
      return "Nhận ca nhiều nhất";
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
}

function buildRows(
  scores: Map<number, { value: number; secondary?: string }>,
  empMap: Map<number, EmployeeRef>,
  formatValue: (v: number) => string,
  minValue: number,
  filter?: (id: number, v: number) => boolean,
): Row[] {
  const arr: Array<{
    id: number;
    value: number;
    secondary?: string;
  }> = [];
  for (const [id, info] of scores.entries()) {
    if (info.value < minValue) continue;
    if (filter && !filter(id, info.value)) continue;
    if (!empMap.has(id)) continue;
    arr.push({ id, value: info.value, secondary: info.secondary });
  }
  arr.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    const an = empMap.get(a.id)?.name ?? "";
    const bn = empMap.get(b.id)?.name ?? "";
    return an.localeCompare(bn);
  });
  const top = arr.slice(0, 10);
  const rows: Row[] = [];
  for (let i = 0; i < top.length; i++) {
    const t = top[i];
    const emp = empMap.get(t.id);
    if (!emp) continue;
    const row: Row = {
      rank: i + 1,
      employee: emp,
      value: t.value,
      displayValue: formatValue(t.value),
    };
    if (t.secondary !== undefined) {
      row.secondary = t.secondary;
    }
    rows.push(row);
  }
  return rows;
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
  const period = parsePeriod(url.searchParams.get("period"));

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const start = periodStart(now, period);
  const streakStart = addDays(today, -89);

  try {
    const [
      employees,
      kudosLogs,
      attendanceWindow,
      attendanceStreak,
      tasksCompleted,
      shiftsWindow,
    ] = await Promise.all([
      prisma.employee.findMany({
        select: { id: true, name: true, role: true, avatarUrl: true },
      }),
      prisma.activityLog.findMany({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: { not: null },
          createdAt: { gte: start, lt: tomorrow },
        },
        select: { entityId: true },
      }),
      prisma.attendance.findMany({
        where: { checkIn: { gte: start, lt: tomorrow } },
        select: { employeeId: true, checkIn: true, hoursWorked: true },
      }),
      prisma.attendance.findMany({
        where: { checkIn: { gte: streakStart, lt: tomorrow } },
        select: { employeeId: true, checkIn: true },
      }),
      prisma.task.findMany({
        where: { completedAt: { gte: start, lt: tomorrow } },
        select: { assigneeId: true },
      }),
      prisma.shift.findMany({
        where: { shiftDate: { gte: start, lt: tomorrow } },
        select: { employeeId: true, shiftDate: true },
      }),
    ]);

    const empMap = new Map<number, EmployeeRef>();
    for (const e of employees) {
      empMap.set(e.id, {
        id: e.id,
        name: e.name,
        role: e.role,
        avatarUrl: e.avatarUrl,
      });
    }

    // mostKudos
    const kudosCount = new Map<number, { value: number; secondary?: string }>();
    for (const k of kudosLogs) {
      if (k.entityId == null) continue;
      const cur = kudosCount.get(k.entityId);
      kudosCount.set(k.entityId, { value: (cur?.value ?? 0) + 1 });
    }
    const mostKudos = buildRows(
      kudosCount,
      empMap,
      (v) => `${v} lời khen`,
      1,
    );

    // mostHours
    const hoursByEmp = new Map<number, { value: number; secondary?: string }>();
    const attDaysByEmp = new Map<number, Set<string>>();
    for (const r of attendanceWindow) {
      const hrs = r.hoursWorked ? Number(r.hoursWorked) : 0;
      const cur = hoursByEmp.get(r.employeeId);
      hoursByEmp.set(r.employeeId, {
        value: round1((cur?.value ?? 0) + hrs),
      });
      const dayKey = ymd(startOfDay(r.checkIn));
      const set = attDaysByEmp.get(r.employeeId);
      if (set) {
        set.add(dayKey);
      } else {
        attDaysByEmp.set(r.employeeId, new Set<string>([dayKey]));
      }
    }
    // attach secondary (days) to hoursByEmp
    for (const [id, info] of hoursByEmp.entries()) {
      const days = attDaysByEmp.get(id)?.size ?? 0;
      hoursByEmp.set(id, {
        value: info.value,
        secondary: `${days} ngày làm việc`,
      });
    }
    const mostHours = buildRows(
      hoursByEmp,
      empMap,
      (v) => `${round1(v)} giờ`,
      0.1,
    );

    // mostTasksCompleted
    const tasksByEmp = new Map<number, { value: number; secondary?: string }>();
    for (const t of tasksCompleted) {
      const cur = tasksByEmp.get(t.assigneeId);
      tasksByEmp.set(t.assigneeId, { value: (cur?.value ?? 0) + 1 });
    }
    const mostTasksCompleted = buildRows(
      tasksByEmp,
      empMap,
      (v) => `${v} việc`,
      1,
    );

    // bestShiftAttendance: shifts scheduled vs attendance taken (by shift date)
    // For each employee: count scheduled shifts within window, and count those
    // dates which the employee has at least one attendance row.
    const shiftDatesByEmp = new Map<number, Set<string>>();
    for (const s of shiftsWindow) {
      const key = ymd(startOfDay(s.shiftDate));
      const set = shiftDatesByEmp.get(s.employeeId);
      if (set) {
        set.add(key);
      } else {
        shiftDatesByEmp.set(s.employeeId, new Set<string>([key]));
      }
    }
    const ratioByEmp = new Map<number, { value: number; secondary?: string }>();
    for (const [id, dates] of shiftDatesByEmp.entries()) {
      const scheduled = dates.size;
      if (scheduled < 5) continue;
      const attDays = attDaysByEmp.get(id) ?? new Set<string>();
      let attended = 0;
      for (const d of dates) {
        if (attDays.has(d)) attended += 1;
      }
      const ratio = scheduled > 0 ? attended / scheduled : 0;
      const pct = Math.round(ratio * 100);
      ratioByEmp.set(id, {
        value: pct,
        secondary: `${attended}/${scheduled} ca`,
      });
    }
    const bestShiftAttendance = buildRows(
      ratioByEmp,
      empMap,
      (v) => `${v}%`,
      0,
    );

    // longestStreak: current consecutive-day streak per employee from last 90d
    const streakDaysByEmp = new Map<number, Set<string>>();
    for (const r of attendanceStreak) {
      const key = ymd(startOfDay(r.checkIn));
      const set = streakDaysByEmp.get(r.employeeId);
      if (set) {
        set.add(key);
      } else {
        streakDaysByEmp.set(r.employeeId, new Set<string>([key]));
      }
    }
    const streakByEmp = new Map<number, { value: number; secondary?: string }>();
    const todayKey = ymd(today);
    const yesterdayKey = ymd(addDays(today, -1));
    for (const [id, days] of streakDaysByEmp.entries()) {
      let cursor: Date | null = null;
      if (days.has(todayKey)) {
        cursor = today;
      } else if (days.has(yesterdayKey)) {
        cursor = addDays(today, -1);
      }
      let streak = 0;
      if (cursor) {
        while (days.has(ymd(cursor))) {
          streak += 1;
          cursor = addDays(cursor, -1);
        }
      }
      if (streak > 0) {
        streakByEmp.set(id, { value: streak });
      }
    }
    const longestStreak = buildRows(
      streakByEmp,
      empMap,
      (v) => `${v} ngày liên tiếp`,
      1,
    );

    // mostShiftCoverage: most shifts taken (count of scheduled shifts in window)
    const coverageByEmp = new Map<
      number,
      { value: number; secondary?: string }
    >();
    for (const s of shiftsWindow) {
      const cur = coverageByEmp.get(s.employeeId);
      coverageByEmp.set(s.employeeId, { value: (cur?.value ?? 0) + 1 });
    }
    const mostShiftCoverage = buildRows(
      coverageByEmp,
      empMap,
      (v) => `${v} ca`,
      1,
    );

    const categories: Record<CategoryKey, Row[]> = {
      mostKudos,
      mostHours,
      mostTasksCompleted,
      bestShiftAttendance,
      longestStreak,
      mostShiftCoverage,
    };

    // Champion: most #1 spots across categories
    const firstPlaceCounts = new Map<number, string[]>();
    const categoryKeys: CategoryKey[] = [
      "mostKudos",
      "mostHours",
      "mostTasksCompleted",
      "bestShiftAttendance",
      "longestStreak",
      "mostShiftCoverage",
    ];
    for (const key of categoryKeys) {
      const rows = categories[key];
      if (rows.length === 0) continue;
      const top = rows[0];
      const list = firstPlaceCounts.get(top.employee.id);
      const title = categoryTitleVi(key);
      if (list) {
        list.push(title);
      } else {
        firstPlaceCounts.set(top.employee.id, [title]);
      }
    }

    let champion: Champion | null = null;
    for (const [id, titles] of firstPlaceCounts.entries()) {
      const emp = empMap.get(id);
      if (!emp) continue;
      if (champion === null || titles.length > champion.titles.length) {
        champion = {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          titles,
        };
      } else if (titles.length === champion.titles.length) {
        // tiebreak by name asc for stability
        if (emp.name.localeCompare(champion.name) < 0) {
          champion = {
            id: emp.id,
            name: emp.name,
            role: emp.role,
            titles,
          };
        }
      }
    }

    const body: LeaderboardsResponse = {
      ok: true,
      generatedAt: now.toISOString(),
      period,
      periodStartIso: start.toISOString(),
      periodEndIso: now.toISOString(),
      champion,
      categories,
    };

    return NextResponse.json(body, {
      headers: {
        "cache-control": "private, max-age=300",
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
