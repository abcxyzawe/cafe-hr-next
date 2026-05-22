import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RoleKey = "barista" | "server" | "cashier" | "manager";

type PulseLevel = "low" | "medium" | "high";

type SubScores = {
  attendance: number;
  hours: number;
  kudos: number;
  tasks: number;
  reliability: number;
  late: number;
  leaveBalance: number;
};

type RoleEntry = {
  role: RoleKey;
  headcount: number;
  activeToday: number;
  avgHoursPerEmployeeLast30: number;
  expectedHoursPerEmployee: number;
  kudosLast30: number;
  tasksCompletedLast30: number;
  tasksOverdueOpen: number;
  approvedLeavesLast30: number;
  lateCheckoutCount30: number;
  scheduledShifts30: number;
  noShows30: number;
  pulseScore: number;
  pulseLevel: PulseLevel;
  pulsePrev: number | null;
  pulseDelta: number | null;
  subScores: SubScores;
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
  pulsePrev: number | null;
  pulseDelta: number | null;
  level: PulseLevel;
  totalEmployees: number;
  narrative: string;
};

type BestWorst = { role: RoleKey; pulse: number };

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

const FULL_TIME_HOURS_30D = 160;
const PART_TIME_HOURS_30D = 60;
const LATE_GRACE_MINUTES = 30;
const DEFAULT_LATE_HOUR = 22;

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
function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
function clamp01to100(n: number): number {
  return Math.round(clamp(n, 0, 100));
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
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
}

function parseHour(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return h + mm / 60;
}

function reliabilityScore(scheduled: number, noShows: number): number {
  if (scheduled <= 0) return 0.7;
  return clamp(1 - noShows / scheduled, 0, 1);
}

function hoursScore(actualPerEmp: number, expectedPerEmp: number): number {
  if (expectedPerEmp <= 0) return 0.5;
  const ratio = actualPerEmp / expectedPerEmp;
  if (ratio <= 1) return clamp(ratio, 0, 1);
  const over = ratio - 1;
  return clamp(1 - over * 2, 0, 1);
}

function kudosScore(kudos: number, headcount: number): number {
  if (headcount <= 0) return 0;
  return clamp(Math.tanh(kudos / headcount), 0, 1);
}

function tasksScore(completed: number, overdueOpen: number): number {
  const total = completed + overdueOpen;
  if (total === 0) return 0.6;
  return clamp(completed / total, 0, 1);
}

function lateScore(late: number, headcount: number): number {
  if (headcount <= 0) return 1;
  const perEmp = late / headcount;
  return clamp(1 - Math.max(0, perEmp - 1) / 2, 0, 1);
}

function leaveBalanceScore(
  leaveDays: number,
  headcount: number,
  windowDays: number,
): number {
  if (headcount <= 0) return 0.5;
  const ratio = leaveDays / (headcount * windowDays);
  if (ratio >= 0.03 && ratio <= 0.07) return 1;
  if (ratio < 0.03) return clamp(ratio / 0.03, 0, 1);
  return clamp(1 - (ratio - 0.07) / 0.13, 0, 1);
}

function combineScores(s: SubScores): number {
  const w = {
    attendance: 0.1,
    hours: 0.18,
    kudos: 0.12,
    tasks: 0.22,
    reliability: 0.22,
    late: 0.06,
    leaveBalance: 0.1,
  };
  const total =
    s.attendance * w.attendance +
    s.hours * w.hours +
    s.kudos * w.kudos +
    s.tasks * w.tasks +
    s.reliability * w.reliability +
    s.late * w.late +
    s.leaveBalance * w.leaveBalance;
  return clamp01to100(total * 100);
}

function buildRoleNarrative(entry: RoleEntry): string {
  const roleVi = roleLabelVi(entry.role);
  const lvl = levelLabelVi(entry.pulseLevel);
  const activeRatio =
    entry.headcount > 0
      ? Math.round((entry.activeToday / entry.headcount) * 100)
      : 0;
  const noShowNote =
    entry.scheduledShifts30 > 0
      ? `, no-show ${entry.noShows30}/${entry.scheduledShifts30} ca`
      : "";
  const trendNote =
    entry.pulseDelta == null
      ? ""
      : entry.pulseDelta > 0
        ? `, tăng ${entry.pulseDelta} so với 30 ngày trước`
        : entry.pulseDelta < 0
          ? `, giảm ${Math.abs(entry.pulseDelta)} so với 30 ngày trước`
          : "";
  return `Nhóm ${roleVi} đang ${lvl} (điểm ${entry.pulseScore}/100${trendNote}): ${entry.activeToday}/${entry.headcount} đi làm hôm nay (${activeRatio}%), trung bình ${entry.avgHoursPerEmployeeLast30}/${entry.expectedHoursPerEmployee} giờ kỳ vọng${noShowNote}, ${entry.kudosLast30} lời khen, hoàn thành ${entry.tasksCompletedLast30} việc, còn ${entry.tasksOverdueOpen} việc quá hạn.`;
}

function buildOverallNarrative(
  pulse: number,
  prev: number | null,
  level: PulseLevel,
  total: number,
  best: BestWorst | null,
  worst: BestWorst | null,
): string {
  const lvl = levelLabelVi(level);
  const parts: string[] = [];
  let trend = "";
  if (prev != null) {
    const d = pulse - prev;
    if (d > 0) trend = ` (tăng ${d} so với 30 ngày trước)`;
    else if (d < 0) trend = ` (giảm ${Math.abs(d)} so với 30 ngày trước)`;
    else trend = " (không đổi)";
  }
  parts.push(
    `Toàn đội ngũ ${total} nhân viên đang ${lvl} với điểm pulse ${pulse}/100${trend}.`,
  );
  if (best) parts.push(`Nhóm tốt nhất: ${roleLabelVi(best.role)} (${best.pulse}/100).`);
  if (worst && (!best || worst.role !== best.role)) {
    parts.push(`Nhóm cần quan tâm: ${roleLabelVi(worst.role)} (${worst.pulse}/100).`);
  }
  return parts.join(" ");
}

type WindowData = {
  attendance: Array<{
    employeeId: number;
    checkIn: Date;
    checkOut: Date | null;
    hoursWorked: unknown;
  }>;
  shifts: Array<{
    employeeId: number;
    shiftDate: Date;
    endTime: string | null;
  }>;
  kudosLogs: Array<{ entityId: number | null }>;
  tasksCompleted: Array<{ assigneeId: number }>;
  tasksOverdue: Array<{ assigneeId: number }>;
  leaves: Array<{
    employeeId: number;
    startDate: Date;
    endDate: Date;
  }>;
};

type EmpExpectedHoursMap = Map<number, number>;

async function buildExpectedHours(
  empIds: number[],
  windowStart: Date,
): Promise<EmpExpectedHoursMap> {
  const baselineStart = addDays(windowStart, -60);
  const baselineEnd = windowStart;
  const baseline = await prisma.attendance.findMany({
    where: {
      employeeId: { in: empIds },
      checkIn: { gte: baselineStart, lt: baselineEnd },
    },
    select: { employeeId: true, hoursWorked: true },
  });
  const sumByEmp = new Map<number, number>();
  for (const r of baseline) {
    const h = r.hoursWorked ? Number(r.hoursWorked) : 0;
    sumByEmp.set(r.employeeId, (sumByEmp.get(r.employeeId) ?? 0) + h);
  }
  const expected = new Map<number, number>();
  for (const id of empIds) {
    const baselineSum = sumByEmp.get(id) ?? 0;
    const monthly = baselineSum / 2;
    if (monthly <= 0) {
      expected.set(id, PART_TIME_HOURS_30D);
    } else {
      expected.set(
        id,
        clamp(round1(monthly), PART_TIME_HOURS_30D * 0.5, FULL_TIME_HOURS_30D),
      );
    }
  }
  return expected;
}

async function collectWindow(
  windowStart: Date,
  windowEnd: Date,
  empIds: number[],
): Promise<WindowData> {
  const [
    attendance,
    shifts,
    kudosLogs,
    tasksCompleted,
    tasksOverdue,
    leaves,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: windowStart, lt: windowEnd } },
      select: {
        employeeId: true,
        checkIn: true,
        checkOut: true,
        hoursWorked: true,
      },
    }),
    prisma.shift.findMany({
      where: { shiftDate: { gte: windowStart, lt: windowEnd } },
      select: { employeeId: true, shiftDate: true, endTime: true },
    }),
    prisma.activityLog.findMany({
      where: {
        action: "kudos.give",
        createdAt: { gte: windowStart, lt: windowEnd },
        entityId: { not: null },
      },
      select: { entityId: true },
    }),
    prisma.task.findMany({
      where: { completedAt: { gte: windowStart, lt: windowEnd } },
      select: { assigneeId: true },
    }),
    prisma.task.findMany({
      where: { completedAt: null, dueDate: { lt: windowStart } },
      select: { assigneeId: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lt: windowEnd },
        endDate: { gte: windowStart },
        employeeId: { in: empIds },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
  ]);
  return { attendance, shifts, kudosLogs, tasksCompleted, tasksOverdue, leaves };
}

type RoleSetMap = Map<RoleKey, Set<number>>;
type EmpIdToRole = Map<number, RoleKey>;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function computeRoleEntries(
  data: WindowData,
  empsByRole: RoleSetMap,
  windowStart: Date,
  windowEnd: Date,
  activeTodaySet: Set<number>,
  expectedHoursMap: EmpExpectedHoursMap,
): RoleEntry[] {
  const windowDays = Math.max(
    1,
    Math.round((windowEnd.getTime() - windowStart.getTime()) / 86_400_000),
  );

  const hoursByEmp = new Map<number, number>();
  const lateByEmp = new Map<number, number>();
  const attendedDayByEmp = new Map<number, Set<string>>();
  const shiftEndByKey = new Map<string, number>();
  for (const s of data.shifts) {
    const k = `${s.employeeId}__${dayKey(s.shiftDate)}`;
    const eh = parseHour(s.endTime);
    if (eh != null) shiftEndByKey.set(k, eh);
  }
  for (const r of data.attendance) {
    const hrs = r.hoursWorked ? Number(r.hoursWorked) : 0;
    hoursByEmp.set(r.employeeId, (hoursByEmp.get(r.employeeId) ?? 0) + hrs);
    let set = attendedDayByEmp.get(r.employeeId);
    if (!set) {
      set = new Set();
      attendedDayByEmp.set(r.employeeId, set);
    }
    set.add(dayKey(r.checkIn));
    if (r.checkOut) {
      const checkoutHour = r.checkOut.getHours() + r.checkOut.getMinutes() / 60;
      const shiftEnd = shiftEndByKey.get(
        `${r.employeeId}__${dayKey(r.checkOut)}`,
      );
      const limit = (shiftEnd ?? DEFAULT_LATE_HOUR) + LATE_GRACE_MINUTES / 60;
      if (checkoutHour > limit) {
        lateByEmp.set(r.employeeId, (lateByEmp.get(r.employeeId) ?? 0) + 1);
      }
    }
  }

  const scheduledByEmp = new Map<number, number>();
  const noShowByEmp = new Map<number, number>();
  for (const s of data.shifts) {
    scheduledByEmp.set(
      s.employeeId,
      (scheduledByEmp.get(s.employeeId) ?? 0) + 1,
    );
    const dk = dayKey(s.shiftDate);
    const attended = attendedDayByEmp.get(s.employeeId)?.has(dk) ?? false;
    if (!attended) {
      noShowByEmp.set(s.employeeId, (noShowByEmp.get(s.employeeId) ?? 0) + 1);
    }
  }

  const kudosByEmp = new Map<number, number>();
  for (const k of data.kudosLogs) {
    if (k.entityId == null) continue;
    kudosByEmp.set(k.entityId, (kudosByEmp.get(k.entityId) ?? 0) + 1);
  }
  const tasksCompByEmp = new Map<number, number>();
  for (const t of data.tasksCompleted)
    tasksCompByEmp.set(
      t.assigneeId,
      (tasksCompByEmp.get(t.assigneeId) ?? 0) + 1,
    );
  const tasksOverByEmp = new Map<number, number>();
  for (const t of data.tasksOverdue)
    tasksOverByEmp.set(
      t.assigneeId,
      (tasksOverByEmp.get(t.assigneeId) ?? 0) + 1,
    );

  const leaveDaysByEmp = new Map<number, number>();
  for (const l of data.leaves) {
    const s = l.startDate < windowStart ? windowStart : l.startDate;
    const e = l.endDate >= windowEnd ? addDays(windowEnd, -1) : l.endDate;
    if (e < s) continue;
    const days = Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
    leaveDaysByEmp.set(
      l.employeeId,
      (leaveDaysByEmp.get(l.employeeId) ?? 0) + days,
    );
  }

  const roles: RoleEntry[] = [];
  for (const [role, idSet] of empsByRole.entries()) {
    const ids = Array.from(idSet);
    const headcount = ids.length;
    let activeToday = 0;
    let totalHours = 0;
    let totalExpected = 0;
    let kudos = 0;
    let comp = 0;
    let over = 0;
    let leaveDays = 0;
    let late = 0;
    let scheduled = 0;
    let noShows = 0;

    for (const id of ids) {
      if (activeTodaySet.has(id)) activeToday++;
      totalHours += hoursByEmp.get(id) ?? 0;
      totalExpected += expectedHoursMap.get(id) ?? PART_TIME_HOURS_30D;
      kudos += kudosByEmp.get(id) ?? 0;
      comp += tasksCompByEmp.get(id) ?? 0;
      over += tasksOverByEmp.get(id) ?? 0;
      leaveDays += leaveDaysByEmp.get(id) ?? 0;
      late += lateByEmp.get(id) ?? 0;
      scheduled += scheduledByEmp.get(id) ?? 0;
      noShows += noShowByEmp.get(id) ?? 0;
    }

    const avgHours = headcount > 0 ? round1(totalHours / headcount) : 0;
    const expectedPerEmp =
      headcount > 0 ? round1(totalExpected / headcount) : 0;

    const sub: SubScores = {
      attendance: headcount > 0 ? activeToday / headcount : 0,
      hours: hoursScore(avgHours, expectedPerEmp),
      kudos: kudosScore(kudos, headcount),
      tasks: tasksScore(comp, over),
      reliability: reliabilityScore(scheduled, noShows),
      late: lateScore(late, headcount),
      leaveBalance: leaveBalanceScore(leaveDays, headcount, windowDays),
    };
    const pulseScore = combineScores(sub);
    const pulseLevel = levelFor(pulseScore);

    const entry: RoleEntry = {
      role,
      headcount,
      activeToday,
      avgHoursPerEmployeeLast30: avgHours,
      expectedHoursPerEmployee: expectedPerEmp,
      kudosLast30: kudos,
      tasksCompletedLast30: comp,
      tasksOverdueOpen: over,
      approvedLeavesLast30: leaveDays,
      lateCheckoutCount30: late,
      scheduledShifts30: scheduled,
      noShows30: noShows,
      pulseScore,
      pulseLevel,
      pulsePrev: null,
      pulseDelta: null,
      subScores: sub,
      narrative: "",
    };
    entry.narrative = buildRoleNarrative(entry);
    roles.push(entry);
  }
  return roles;
}

export async function GET() {
  const sess = await getSession();
  if (!sess)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (sess.role !== "admin")
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const curStart = addDays(today, -29);
  const prevEnd = curStart;
  const prevStart = addDays(prevEnd, -30);

  try {
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, role: true },
    });
    const empIds = employees.map((e) => e.id);
    if (empIds.length === 0) {
      const empty: TeamPulseResponse = {
        ok: true,
        generatedAt: now.toISOString(),
        windowDays: 30,
        overall: {
          pulse: 0,
          pulsePrev: null,
          pulseDelta: null,
          level: "low",
          totalEmployees: 0,
          narrative: "Chưa có nhân viên",
        },
        best: null,
        worst: null,
        kudosLeader: null,
        roles: [],
      };
      return NextResponse.json(empty);
    }

    const roleMap: EmpIdToRole = new Map();
    const empNameMap = new Map<number, string>();
    const empsByRole: RoleSetMap = new Map();
    for (const e of employees) {
      const role = e.role as RoleKey;
      roleMap.set(e.id, role);
      empNameMap.set(e.id, e.name);
      const set = empsByRole.get(role);
      if (set) set.add(e.id);
      else empsByRole.set(role, new Set([e.id]));
    }

    const [curData, prevData, attendanceToday, expectedHoursMap] =
      await Promise.all([
        collectWindow(curStart, tomorrow, empIds),
        collectWindow(prevStart, prevEnd, empIds),
        prisma.attendance.findMany({
          where: { checkIn: { gte: today, lt: tomorrow } },
          select: { employeeId: true },
          distinct: ["employeeId"],
        }),
        buildExpectedHours(empIds, curStart),
      ]);

    const activeTodaySet = new Set<number>(
      attendanceToday.map((a) => a.employeeId),
    );
    const prevActiveSet = new Set<number>();
    for (const r of prevData.attendance) prevActiveSet.add(r.employeeId);

    const curRoles = computeRoleEntries(
      curData,
      empsByRole,
      curStart,
      tomorrow,
      activeTodaySet,
      expectedHoursMap,
    );
    const prevRoles = computeRoleEntries(
      prevData,
      empsByRole,
      prevStart,
      prevEnd,
      prevActiveSet,
      expectedHoursMap,
    );
    const prevByRole = new Map(prevRoles.map((r) => [r.role, r.pulseScore]));
    for (const r of curRoles) {
      const p = prevByRole.get(r.role);
      if (p != null) {
        r.pulsePrev = p;
        r.pulseDelta = r.pulseScore - p;
        r.narrative = buildRoleNarrative(r);
      }
    }

    curRoles.sort((a, b) => b.pulseScore - a.pulseScore);

    let totalEmployees = 0;
    let weighted = 0;
    let prevWeighted = 0;
    let best: BestWorst | null = null;
    let worst: BestWorst | null = null;
    for (const r of curRoles) {
      totalEmployees += r.headcount;
      weighted += r.pulseScore * r.headcount;
      const p = prevByRole.get(r.role);
      if (p != null) prevWeighted += p * r.headcount;
      if (best === null || r.pulseScore > best.pulse)
        best = { role: r.role, pulse: r.pulseScore };
      if (worst === null || r.pulseScore < worst.pulse)
        worst = { role: r.role, pulse: r.pulseScore };
    }
    const overallPulse =
      totalEmployees > 0 ? clamp01to100(weighted / totalEmployees) : 0;
    const overallPrev =
      totalEmployees > 0 ? clamp01to100(prevWeighted / totalEmployees) : 0;
    const overallLevel = levelFor(overallPulse);

    const kudosByEmp = new Map<number, number>();
    for (const k of curData.kudosLogs) {
      if (k.entityId == null) continue;
      kudosByEmp.set(k.entityId, (kudosByEmp.get(k.entityId) ?? 0) + 1);
    }
    let kudosLeader: KudosLeader | null = null;
    for (const [empId, count] of kudosByEmp.entries()) {
      const role = roleMap.get(empId);
      const name = empNameMap.get(empId);
      if (!role || !name) continue;
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
        pulsePrev: overallPrev,
        pulseDelta: overallPulse - overallPrev,
        level: overallLevel,
        totalEmployees,
        narrative: buildOverallNarrative(
          overallPulse,
          overallPrev,
          overallLevel,
          totalEmployees,
          best,
          worst,
        ),
      },
      best,
      worst,
      kudosLeader,
      roles: curRoles,
    };

    return NextResponse.json(body, {
      headers: { "cache-control": "private, max-age=300" },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 503 });
  }
}
