import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RoleKey = "barista" | "server" | "cashier" | "manager";

type PulseLevel = "low" | "medium" | "high";

type RoleEntry = {
  role: RoleKey;
  headcount: number;
  activeToday: number;
  avgHoursPerEmployeeLast30: number;
  kudosLast30: number;
  tasksCompletedLast30: number;
  tasksOverdueOpen: number;
  approvedLeavesLast30: number;
  lateCheckoutCount30: number;
  pulseScore: number;
  pulseLevel: PulseLevel;
  narrative: string;
};

type KudosLeader = {
  id: number;
  name: string;
  role: RoleKey;
  count: number;
};

type OverallSummary = {
  pulse: number;
  level: PulseLevel;
  totalEmployees: number;
  narrative: string;
};

type BestWorst = {
  role: RoleKey;
  pulse: number;
};

type TeamPulseResponse = {
  ok: true;
  generatedAt: string;
  windowDays: 30;
  overall: OverallSummary;
  best: BestWorst | null;
  worst: BestWorst | null;
  kudosLeader: KudosLeader | null;
  roles: RoleEntry[];
};

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

function clamp01to100(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function levelFor(score: number): PulseLevel {
  if (score <= 40) return "low";
  if (score <= 70) return "medium";
  return "high";
}

function roleLabelVi(role: RoleKey): string {
  switch (role) {
    case "barista":
      return "Pha chế";
    case "server":
      return "Phục vụ";
    case "cashier":
      return "Thu ngân";
    case "manager":
      return "Quản lý";
  }
}

function levelLabelVi(level: PulseLevel): string {
  if (level === "high") return "khỏe mạnh";
  if (level === "medium") return "ổn định";
  return "cần chú ý";
}

function buildRoleNarrative(entry: RoleEntry): string {
  const roleVi = roleLabelVi(entry.role);
  const lvl = levelLabelVi(entry.pulseLevel);
  const activeRatio =
    entry.headcount > 0
      ? Math.round((entry.activeToday / entry.headcount) * 100)
      : 0;
  return `Nhóm ${roleVi} đang ${lvl} (điểm ${entry.pulseScore}/100): ${entry.activeToday}/${entry.headcount} đi làm hôm nay (${activeRatio}%), trung bình ${entry.avgHoursPerEmployeeLast30} giờ/người trong 30 ngày, ${entry.kudosLast30} lời khen, hoàn thành ${entry.tasksCompletedLast30} việc và còn ${entry.tasksOverdueOpen} việc quá hạn.`;
}

function buildOverallNarrative(
  pulse: number,
  level: PulseLevel,
  total: number,
  best: BestWorst | null,
  worst: BestWorst | null,
): string {
  const lvl = levelLabelVi(level);
  const parts: string[] = [];
  parts.push(
    `Toàn đội ngũ ${total} nhân viên đang ${lvl} với điểm pulse ${pulse}/100.`,
  );
  if (best) {
    parts.push(
      `Nhóm tốt nhất: ${roleLabelVi(best.role)} (${best.pulse}/100).`,
    );
  }
  if (worst && (!best || worst.role !== best.role)) {
    parts.push(
      `Nhóm cần quan tâm nhất: ${roleLabelVi(worst.role)} (${worst.pulse}/100).`,
    );
  }
  return parts.join(" ");
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
}

function computePulseScore(input: {
  headcount: number;
  activeToday: number;
  avgHoursPerEmployeeLast30: number;
  kudosLast30: number;
  tasksCompletedLast30: number;
  tasksOverdueOpen: number;
  approvedLeavesLast30: number;
  lateCheckoutCount30: number;
}): number {
  let score = 20; // base

  if (input.headcount > 0 && input.activeToday / input.headcount >= 0.5) {
    score += 20;
  }

  const avgH = input.avgHoursPerEmployeeLast30;
  if (avgH >= 120 && avgH <= 200) {
    score += 15;
  } else if (avgH > 240) {
    score -= 10;
  }
  // 0-120 explicitly +0

  if (input.headcount > 0 && input.kudosLast30 / input.headcount >= 1) {
    score += 20;
  }

  if (input.tasksCompletedLast30 >= input.tasksOverdueOpen) {
    score += 15;
  }

  if (input.lateCheckoutCount30 > input.headcount * 2) {
    score -= 10;
  }

  if (input.approvedLeavesLast30 > 0) {
    score += 10;
  }

  return clamp01to100(score);
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
  const last30Start = addDays(today, -29);

  try {
    const [
      employees,
      attendance30,
      attendanceToday,
      kudosLogs,
      tasksCompleted,
      tasksOverdue,
      approvedLeaves,
    ] = await Promise.all([
      prisma.employee.findMany({
        select: { id: true, name: true, role: true },
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
      prisma.attendance.findMany({
        where: { checkIn: { gte: today, lt: tomorrow } },
        select: { employeeId: true },
        distinct: ["employeeId"],
      }),
      prisma.activityLog.findMany({
        where: {
          action: "kudos.give",
          createdAt: { gte: last30Start },
          entityId: { not: null },
        },
        select: { entityId: true },
      }),
      prisma.task.findMany({
        where: { completedAt: { gte: last30Start, lt: tomorrow } },
        select: { assigneeId: true },
      }),
      prisma.task.findMany({
        where: { completedAt: null, dueDate: { lt: today } },
        select: { assigneeId: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "approved",
          startDate: { gte: last30Start, lt: tomorrow },
        },
        select: { employeeId: true },
      }),
    ]);

    // Build employee -> role map
    const empRoleMap = new Map<number, RoleKey>();
    const empNameMap = new Map<number, string>();
    const empsByRole = new Map<RoleKey, Set<number>>();
    for (const e of employees) {
      const role = e.role as RoleKey;
      empRoleMap.set(e.id, role);
      empNameMap.set(e.id, e.name);
      const set = empsByRole.get(role);
      if (set) {
        set.add(e.id);
      } else {
        empsByRole.set(role, new Set<number>([e.id]));
      }
    }

    // Active today set
    const activeTodaySet = new Set<number>();
    for (const a of attendanceToday) {
      activeTodaySet.add(a.employeeId);
    }

    // Hours / late checkouts per employee from attendance30
    const hoursByEmp = new Map<number, number>();
    const lateByEmp = new Map<number, number>();
    for (const r of attendance30) {
      const hrs = r.hoursWorked ? Number(r.hoursWorked) : 0;
      hoursByEmp.set(r.employeeId, (hoursByEmp.get(r.employeeId) ?? 0) + hrs);
      if (r.checkOut && r.checkOut.getHours() >= 22) {
        lateByEmp.set(r.employeeId, (lateByEmp.get(r.employeeId) ?? 0) + 1);
      }
    }

    // Kudos per employee (entityId is employee id)
    const kudosByEmp = new Map<number, number>();
    for (const k of kudosLogs) {
      if (k.entityId == null) continue;
      kudosByEmp.set(k.entityId, (kudosByEmp.get(k.entityId) ?? 0) + 1);
    }

    // Tasks completed / overdue per assignee
    const tasksCompletedByEmp = new Map<number, number>();
    for (const t of tasksCompleted) {
      tasksCompletedByEmp.set(
        t.assigneeId,
        (tasksCompletedByEmp.get(t.assigneeId) ?? 0) + 1,
      );
    }
    const tasksOverdueByEmp = new Map<number, number>();
    for (const t of tasksOverdue) {
      tasksOverdueByEmp.set(
        t.assigneeId,
        (tasksOverdueByEmp.get(t.assigneeId) ?? 0) + 1,
      );
    }

    // Approved leaves per employee in window
    const leavesByEmp = new Map<number, number>();
    for (const l of approvedLeaves) {
      leavesByEmp.set(l.employeeId, (leavesByEmp.get(l.employeeId) ?? 0) + 1);
    }

    // Build role entries
    const roles: RoleEntry[] = [];
    for (const [role, idSet] of empsByRole.entries()) {
      const ids = Array.from(idSet);
      const headcount = ids.length;
      let activeToday = 0;
      let totalHours = 0;
      let kudosLast30 = 0;
      let tasksCompletedLast30 = 0;
      let tasksOverdueOpen = 0;
      let approvedLeavesLast30 = 0;
      let lateCheckoutCount30 = 0;

      for (const id of ids) {
        if (activeTodaySet.has(id)) activeToday += 1;
        totalHours += hoursByEmp.get(id) ?? 0;
        kudosLast30 += kudosByEmp.get(id) ?? 0;
        tasksCompletedLast30 += tasksCompletedByEmp.get(id) ?? 0;
        tasksOverdueOpen += tasksOverdueByEmp.get(id) ?? 0;
        approvedLeavesLast30 += leavesByEmp.get(id) ?? 0;
        lateCheckoutCount30 += lateByEmp.get(id) ?? 0;
      }

      const avgHoursPerEmployeeLast30 =
        headcount > 0 ? round1(totalHours / headcount) : 0;

      const pulseScore = computePulseScore({
        headcount,
        activeToday,
        avgHoursPerEmployeeLast30,
        kudosLast30,
        tasksCompletedLast30,
        tasksOverdueOpen,
        approvedLeavesLast30,
        lateCheckoutCount30,
      });
      const pulseLevel = levelFor(pulseScore);

      const entry: RoleEntry = {
        role,
        headcount,
        activeToday,
        avgHoursPerEmployeeLast30,
        kudosLast30,
        tasksCompletedLast30,
        tasksOverdueOpen,
        approvedLeavesLast30,
        lateCheckoutCount30,
        pulseScore,
        pulseLevel,
        narrative: "",
      };
      entry.narrative = buildRoleNarrative(entry);
      roles.push(entry);
    }

    roles.sort((a, b) => b.pulseScore - a.pulseScore);

    // Overall pulse weighted by headcount
    let totalEmployees = 0;
    let weightedSum = 0;
    let best: BestWorst | null = null;
    let worst: BestWorst | null = null;
    for (const r of roles) {
      totalEmployees += r.headcount;
      weightedSum += r.pulseScore * r.headcount;
      if (best === null || r.pulseScore > best.pulse) {
        best = { role: r.role, pulse: r.pulseScore };
      }
      if (worst === null || r.pulseScore < worst.pulse) {
        worst = { role: r.role, pulse: r.pulseScore };
      }
    }
    const overallPulse =
      totalEmployees > 0 ? clamp01to100(weightedSum / totalEmployees) : 0;
    const overallLevel = levelFor(overallPulse);

    // Kudos leader
    let kudosLeader: KudosLeader | null = null;
    for (const [empId, count] of kudosByEmp.entries()) {
      const role = empRoleMap.get(empId);
      const name = empNameMap.get(empId);
      if (!role || !name) continue; // entityId may refer to non-employee
      if (kudosLeader === null || count > kudosLeader.count) {
        kudosLeader = { id: empId, name, role, count };
      }
    }

    const body: TeamPulseResponse = {
      ok: true,
      generatedAt: now.toISOString(),
      windowDays: 30,
      overall: {
        pulse: overallPulse,
        level: overallLevel,
        totalEmployees,
        narrative: buildOverallNarrative(
          overallPulse,
          overallLevel,
          totalEmployees,
          best,
          worst,
        ),
      },
      best,
      worst,
      kudosLeader,
      roles,
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
