import "server-only";
import { prisma } from "./prisma";
import type { EmployeeMetrics } from "./compare-metrics";

const LATE_THRESHOLD_MIN = 10;

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseHHMMtoMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesOfDayLocal(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Pulls the 5 metrics needed for the radar chart for the given employees.
 * Reliability is approximated as scheduled-shift days that have a matching
 * attendance entry on the same day, divided by total scheduled days.
 * Late-detection logic mirrors src/lib/late-arrivals.ts but scoped to the
 * current calendar month.
 */
export async function getCompareMetrics(
  employeeIds: number[],
): Promise<EmployeeMetrics[]> {
  if (employeeIds.length === 0) return [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [employees, attendance, shifts, kudos] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true },
    }),
    prisma.attendance.findMany({
      where: {
        employeeId: { in: employeeIds },
        checkIn: { gte: monthStart, lt: nextMonth },
      },
      select: {
        employeeId: true,
        checkIn: true,
        hoursWorked: true,
      },
    }),
    prisma.shift.findMany({
      where: {
        employeeId: { in: employeeIds },
        shiftDate: { gte: monthStart, lt: nextMonth },
      },
      select: { employeeId: true, shiftDate: true, startTime: true },
    }),
    prisma.activityLog.groupBy({
      by: ["entityId"],
      where: {
        action: "kudos.give",
        entityType: "employee",
        entityId: { in: employeeIds },
        createdAt: { gte: ninetyDaysAgo },
      },
      _count: { _all: true },
    }),
  ]);

  const monthHoursMap = new Map<number, number>();
  const daysWorkedMap = new Map<number, Set<string>>();
  for (const a of attendance) {
    monthHoursMap.set(
      a.employeeId,
      (monthHoursMap.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0),
    );
    let set = daysWorkedMap.get(a.employeeId);
    if (!set) {
      set = new Set<string>();
      daysWorkedMap.set(a.employeeId, set);
    }
    set.add(dateKey(a.checkIn));
  }

  const shiftMap = new Map<string, string>();
  const shiftsScheduledByEmp = new Map<number, number>();
  const shiftKeysByEmp = new Map<number, Set<string>>();
  for (const s of shifts) {
    shiftsScheduledByEmp.set(
      s.employeeId,
      (shiftsScheduledByEmp.get(s.employeeId) ?? 0) + 1,
    );
    const key = `${s.employeeId}|${dateKey(s.shiftDate)}`;
    let set = shiftKeysByEmp.get(s.employeeId);
    if (!set) {
      set = new Set<string>();
      shiftKeysByEmp.set(s.employeeId, set);
    }
    set.add(key);
    if (!s.startTime) continue;
    const existing = shiftMap.get(key);
    if (!existing) {
      shiftMap.set(key, s.startTime);
      continue;
    }
    const prev = parseHHMMtoMinutes(existing);
    const curr = parseHHMMtoMinutes(s.startTime);
    if (prev !== null && curr !== null && curr < prev) {
      shiftMap.set(key, s.startTime);
    }
  }

  const attendedKeysByEmp = new Map<number, Set<string>>();
  for (const a of attendance) {
    const key = `${a.employeeId}|${dateKey(a.checkIn)}`;
    let set = attendedKeysByEmp.get(a.employeeId);
    if (!set) {
      set = new Set<string>();
      attendedKeysByEmp.set(a.employeeId, set);
    }
    set.add(key);
  }

  const lateByEmp = new Map<number, number>();
  for (const a of attendance) {
    const key = `${a.employeeId}|${dateKey(a.checkIn)}`;
    const startStr = shiftMap.get(key);
    if (!startStr) continue;
    const startMin = parseHHMMtoMinutes(startStr);
    if (startMin === null) continue;
    const checkInMin = minutesOfDayLocal(a.checkIn);
    if (checkInMin > startMin + LATE_THRESHOLD_MIN) {
      lateByEmp.set(a.employeeId, (lateByEmp.get(a.employeeId) ?? 0) + 1);
    }
  }

  const kudosMap = new Map<number, number>();
  for (const k of kudos) {
    if (k.entityId == null) continue;
    kudosMap.set(k.entityId, k._count._all);
  }

  const empMap = new Map(employees.map((e) => [e.id, e]));

  const results: EmployeeMetrics[] = [];
  for (const id of employeeIds) {
    const emp = empMap.get(id);
    if (!emp) continue;
    const scheduled = shiftsScheduledByEmp.get(id) ?? 0;
    const shiftKeys = shiftKeysByEmp.get(id) ?? new Set<string>();
    const attendedKeys = attendedKeysByEmp.get(id) ?? new Set<string>();
    let attendedScheduled = 0;
    for (const key of shiftKeys) {
      if (attendedKeys.has(key)) attendedScheduled++;
    }
    const reliabilityPct =
      scheduled === 0
        ? 0
        : Math.round((attendedScheduled / scheduled) * 1000) / 10;

    results.push({
      employeeId: id,
      name: emp.name,
      monthHours: Math.round((monthHoursMap.get(id) ?? 0) * 100) / 100,
      reliabilityPct,
      daysWorked: daysWorkedMap.get(id)?.size ?? 0,
      kudosCount: kudosMap.get(id) ?? 0,
      lateCount: lateByEmp.get(id) ?? 0,
    });
  }
  return results;
}
