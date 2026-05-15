import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RiskLevel = "low" | "medium" | "high";

type Signals = {
  consecutiveDaysWorked: number;
  totalHoursLast7: number;
  totalHoursLast30: number;
  avgHoursPerWorkedDay30: number;
  daysWithoutLeaveLast90: number;
  lateCheckoutCount30: number;
  daysOff7: number;
};

type EmployeeRef = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type BurnoutItem = {
  employee: EmployeeRef;
  riskScore: number;
  riskLevel: RiskLevel;
  signals: Signals;
  reasons: string[];
  recommendationVi: string;
};

type BurnoutResponse = {
  ok: true;
  generatedAt: string;
  windowDays: 30;
  summary: {
    total: number;
    low: number;
    medium: number;
    high: number;
    avgRisk: number;
  };
  items: BurnoutItem[];
};

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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function levelFor(score: number): RiskLevel {
  if (score <= 30) return "low";
  if (score <= 55) return "medium";
  return "high";
}

function recommendationFor(level: RiskLevel): string {
  if (level === "high") {
    return "Cần can thiệp ngay: sắp xếp nghỉ bù, giảm ca trong tuần tới và trao đổi 1-1 để hỗ trợ nhân viên.";
  }
  if (level === "medium") {
    return "Theo dõi sát: cân nhắc giãn ca, khuyến khích nghỉ phép và kiểm tra khối lượng công việc hiện tại.";
  }
  return "Tình trạng ổn định: tiếp tục duy trì lịch làm hợp lý và ghi nhận đóng góp của nhân viên.";
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
  const last7Start = addDays(today, -6);
  const last30Start = addDays(today, -29);
  const last90Start = addDays(today, -89);

  try {
    const [employees, attendance, approvedLeaves] = await Promise.all([
      prisma.employee.findMany({
        select: { id: true, name: true, role: true, avatarUrl: true },
      }),
      prisma.attendance.findMany({
        where: { checkIn: { gte: last30Start, lt: tomorrow } },
        select: {
          employeeId: true,
          checkIn: true,
          checkOut: true,
          hoursWorked: true,
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "approved",
          startDate: { lte: today },
          endDate: { gte: last90Start },
        },
        select: { employeeId: true },
      }),
    ]);

    type AttRow = (typeof attendance)[number];
    const attByEmp = new Map<number, AttRow[]>();
    for (const a of attendance) {
      const list = attByEmp.get(a.employeeId);
      if (list) {
        list.push(a);
      } else {
        attByEmp.set(a.employeeId, [a]);
      }
    }

    const empWithLeave = new Set<number>();
    for (const l of approvedLeaves) {
      empWithLeave.add(l.employeeId);
    }

    const items: BurnoutItem[] = [];

    for (const emp of employees) {
      const rows = attByEmp.get(emp.id) ?? [];

      const hoursByDay = new Map<string, number>();
      let totalHoursLast7 = 0;
      let totalHoursLast30 = 0;
      let lateCheckoutCount30 = 0;

      for (const r of rows) {
        const dayKey = ymd(startOfDay(r.checkIn));
        const hrs = r.hoursWorked ? Number(r.hoursWorked) : 0;
        hoursByDay.set(dayKey, (hoursByDay.get(dayKey) ?? 0) + hrs);
        totalHoursLast30 += hrs;
        if (r.checkIn.getTime() >= last7Start.getTime()) {
          totalHoursLast7 += hrs;
        }
        if (r.checkOut) {
          const co = r.checkOut;
          if (co.getHours() >= 22) {
            lateCheckoutCount30 += 1;
          }
        }
      }

      let daysWorked30 = 0;
      for (const v of hoursByDay.values()) {
        if (v > 0) daysWorked30 += 1;
      }
      const avgHoursPerWorkedDay30 =
        daysWorked30 > 0 ? totalHoursLast30 / daysWorked30 : 0;

      // consecutive streak ending today or yesterday
      let consecutiveDaysWorked = 0;
      const todayKey = ymd(today);
      const yesterdayKey = ymd(addDays(today, -1));
      let cursor: Date | null = null;
      if (hoursByDay.has(todayKey)) {
        cursor = today;
      } else if (hoursByDay.has(yesterdayKey)) {
        cursor = addDays(today, -1);
      }
      if (cursor) {
        while (hoursByDay.has(ymd(cursor))) {
          consecutiveDaysWorked += 1;
          cursor = addDays(cursor, -1);
        }
      }

      // daysOff7: number of days in last 7 with zero attendance
      let daysOff7 = 0;
      for (let i = 0; i < 7; i++) {
        const key = ymd(addDays(today, -i));
        if (!hoursByDay.has(key)) daysOff7 += 1;
      }

      // daysWithoutLeaveLast90: 90 if no approved leave in 90d, else 0
      const daysWithoutLeaveLast90 = empWithLeave.has(emp.id) ? 0 : 90;

      const signals: Signals = {
        consecutiveDaysWorked,
        totalHoursLast7: round1(totalHoursLast7),
        totalHoursLast30: round1(totalHoursLast30),
        avgHoursPerWorkedDay30: round1(avgHoursPerWorkedDay30),
        daysWithoutLeaveLast90,
        lateCheckoutCount30,
        daysOff7,
      };

      const reasons: string[] = [];
      let score = 0;

      if (consecutiveDaysWorked >= 7) {
        score += 30;
        reasons.push(
          `Làm việc liên tục ${consecutiveDaysWorked} ngày không nghỉ.`,
        );
      }
      if (totalHoursLast7 >= 56) {
        score += 25;
        reasons.push(
          `Đã làm ${round1(totalHoursLast7)} giờ trong 7 ngày qua (≥56).`,
        );
      }
      if (daysWithoutLeaveLast90 >= 90) {
        score += 20;
        reasons.push("Không nghỉ phép nào trong 90 ngày gần đây.");
      }
      if (avgHoursPerWorkedDay30 >= 9) {
        score += 10;
        reasons.push(
          `Trung bình ${round1(avgHoursPerWorkedDay30)} giờ mỗi ngày làm việc (≥9).`,
        );
      }
      if (lateCheckoutCount30 >= 3) {
        score += 10;
        reasons.push(
          `${lateCheckoutCount30} lần tan ca sau 22:00 trong 30 ngày.`,
        );
      }
      if (daysOff7 <= 1) {
        score += 5;
        reasons.push(
          `Chỉ có ${daysOff7} ngày nghỉ trong 7 ngày gần đây.`,
        );
      }

      if (score > 100) score = 100;
      const riskLevel = levelFor(score);

      items.push({
        employee: {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          avatarUrl: emp.avatarUrl,
        },
        riskScore: score,
        riskLevel,
        signals,
        reasons,
        recommendationVi: recommendationFor(riskLevel),
      });
    }

    items.sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return a.employee.name.localeCompare(b.employee.name);
    });

    let low = 0;
    let medium = 0;
    let high = 0;
    let scoreSum = 0;
    for (const it of items) {
      scoreSum += it.riskScore;
      if (it.riskLevel === "low") low += 1;
      else if (it.riskLevel === "medium") medium += 1;
      else high += 1;
    }
    const avgRisk =
      items.length > 0 ? Math.round((scoreSum / items.length) * 10) / 10 : 0;

    const body: BurnoutResponse = {
      ok: true,
      generatedAt: now.toISOString(),
      windowDays: 30,
      summary: {
        total: items.length,
        low,
        medium,
        high,
        avgRisk,
      },
      items,
    };

    return NextResponse.json(body, {
      headers: {
        "cache-control": "private, max-age=300, s-maxage=300",
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
