import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DayPoint = {
  iso: string;
  weekday: string;
  worked: boolean;
  hours: number;
};

type StreakResponse = {
  ok: true;
  asOf: string;
  employee: { id: number; name: string; role: string } | null;
  current: {
    days: number;
    startIso: string | null;
    lastWorkedIso: string | null;
  };
  longest: {
    days: number;
    startIso: string | null;
    endIso: string | null;
  };
  last30: {
    daysWorked: number;
    totalHours: number;
    averageHoursPerWorkedDay: number;
    activityPoints: DayPoint[];
  };
  kudos: {
    totalLast30: number;
    fromUnique: number;
  };
  upcomingShifts: number;
  badges: { code: string; label: string; earned: boolean; tooltip: string }[];
};

const WEEKDAY_VI = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = startOfDay(now);
  const last30Start = addDays(today, -29);
  const last90Start = addDays(today, -89);
  const tomorrow = addDays(today, 1);
  const inSevenDays = addDays(tomorrow, 7);

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
      const empty: StreakResponse = {
        ok: true,
        asOf: now.toISOString(),
        employee: null,
        current: { days: 0, startIso: null, lastWorkedIso: null },
        longest: { days: 0, startIso: null, endIso: null },
        last30: {
          daysWorked: 0,
          totalHours: 0,
          averageHoursPerWorkedDay: 0,
          activityPoints: [],
        },
        kudos: { totalLast30: 0, fromUnique: 0 },
        upcomingShifts: 0,
        badges: [],
      };
      return NextResponse.json(empty);
    }

    const [attendance, kudos, upcoming] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          checkIn: { gte: last90Start },
        },
        select: { checkIn: true, hoursWorked: true },
        orderBy: { checkIn: "asc" },
      }),
      prisma.activityLog.findMany({
        where: {
          action: "kudos.give",
          entityType: "employee",
          entityId: employee.id,
          createdAt: { gte: last30Start },
        },
        select: { userId: true },
      }),
      prisma.shift.count({
        where: {
          employeeId: employee.id,
          shiftDate: { gte: tomorrow, lt: inSevenDays },
        },
      }),
    ]);

    const workedByDay = new Map<string, number>();
    for (const a of attendance) {
      const key = ymd(startOfDay(a.checkIn));
      const hours = a.hoursWorked ? Number(a.hoursWorked) : 0;
      workedByDay.set(key, (workedByDay.get(key) ?? 0) + hours);
    }

    let lastWorkedIso: string | null = null;
    for (let i = 0; i < 90; i++) {
      const key = ymd(addDays(today, -i));
      if (workedByDay.has(key)) {
        lastWorkedIso = key;
        break;
      }
    }

    let currentDays = 0;
    let currentStartIso: string | null = null;
    if (lastWorkedIso) {
      const lastWorkedDate = new Date(`${lastWorkedIso}T00:00:00`);
      const gapFromToday = Math.round(
        (today.getTime() - lastWorkedDate.getTime()) / 86_400_000,
      );
      if (gapFromToday <= 1) {
        let cursor = lastWorkedDate;
        while (workedByDay.has(ymd(cursor))) {
          currentDays += 1;
          currentStartIso = ymd(cursor);
          cursor = addDays(cursor, -1);
        }
      }
    }

    let longestDays = 0;
    let longestStartIso: string | null = null;
    let longestEndIso: string | null = null;
    let runStart: string | null = null;
    let run = 0;
    let prevKey: string | null = null;
    const sortedKeys = Array.from(workedByDay.keys()).sort();
    for (const key of sortedKeys) {
      if (prevKey === null) {
        run = 1;
        runStart = key;
      } else {
        const prevDate = new Date(`${prevKey}T00:00:00`);
        const expectedNext = ymd(addDays(prevDate, 1));
        if (key === expectedNext) {
          run += 1;
        } else {
          run = 1;
          runStart = key;
        }
      }
      if (run > longestDays) {
        longestDays = run;
        longestStartIso = runStart;
        longestEndIso = key;
      }
      prevKey = key;
    }

    const activityPoints: DayPoint[] = [];
    let totalHours30 = 0;
    let daysWorked30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(last30Start, i);
      const key = ymd(d);
      const hrs = workedByDay.get(key) ?? 0;
      if (hrs > 0) {
        daysWorked30 += 1;
        totalHours30 += hrs;
      }
      activityPoints.push({
        iso: key,
        weekday: WEEKDAY_VI[d.getDay()],
        worked: hrs > 0,
        hours: Math.round(hrs * 10) / 10,
      });
    }

    const uniqueGivers = new Set(
      kudos.map((k) => k.userId).filter((id): id is number => id !== null),
    );

    const badges: StreakResponse["badges"] = [
      {
        code: "first-streak",
        label: "Bắt nhịp",
        earned: currentDays >= 1,
        tooltip: "Có ít nhất 1 ngày làm việc gần đây.",
      },
      {
        code: "week-warrior",
        label: "Chiến binh tuần",
        earned: currentDays >= 5 || longestDays >= 5,
        tooltip: "Chuỗi làm việc liên tiếp ≥ 5 ngày.",
      },
      {
        code: "iron-streak",
        label: "Sắt thép",
        earned: longestDays >= 10,
        tooltip: "Đã từng có chuỗi ≥ 10 ngày.",
      },
      {
        code: "active-30",
        label: "Năng suất 30 ngày",
        earned: daysWorked30 >= 15,
        tooltip: "Làm việc ≥ 15 ngày trong 30 ngày qua.",
      },
      {
        code: "kudos-magnet",
        label: "Người được ngưỡng mộ",
        earned: kudos.length >= 3,
        tooltip: "Nhận ≥ 3 lượt kudos trong 30 ngày qua.",
      },
      {
        code: "team-favorite",
        label: "Cả đội tin tưởng",
        earned: uniqueGivers.size >= 3,
        tooltip: "Được ≥ 3 người khác nhau gửi kudos.",
      },
    ];

    const response: StreakResponse = {
      ok: true,
      asOf: now.toISOString(),
      employee,
      current: {
        days: currentDays,
        startIso: currentStartIso,
        lastWorkedIso,
      },
      longest: {
        days: longestDays,
        startIso: longestStartIso,
        endIso: longestEndIso,
      },
      last30: {
        daysWorked: daysWorked30,
        totalHours: Math.round(totalHours30 * 10) / 10,
        averageHoursPerWorkedDay:
          daysWorked30 > 0
            ? Math.round((totalHours30 / daysWorked30) * 10) / 10
            : 0,
        activityPoints,
      },
      kudos: {
        totalLast30: kudos.length,
        fromUnique: uniqueGivers.size,
      },
      upcomingShifts: upcoming,
      badges,
    };

    return NextResponse.json(response, {
      headers: { "cache-control": "private, max-age=60" },
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
