import "server-only";
import { prisma } from "./prisma";

export type Anomaly = {
  id: string;
  severity: "warning" | "critical" | "info";
  icon: "clock" | "user-x" | "trending-down" | "alert-triangle";
  title: string;
  description: string;
  employeeId?: number;
  employeeName?: string;
};

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

function parseHHMM(t: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function severityRank(s: Anomaly["severity"]): number {
  if (s === "critical") return 0;
  if (s === "warning") return 1;
  return 2;
}

const MAX_ANOMALIES = 8;

export async function getAnomalies(): Promise<Anomaly[]> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const start14 = new Date(startOfToday);
  start14.setDate(start14.getDate() - 14);

  const start7 = new Date(startOfToday);
  start7.setDate(start7.getDate() - 7);

  const startThisWeek = new Date(startOfToday);
  const dow = startThisWeek.getDay();
  const diffToMon = (dow + 6) % 7;
  startThisWeek.setDate(startThisWeek.getDate() - diffToMon);
  const startLastWeek = new Date(startThisWeek);
  startLastWeek.setDate(startLastWeek.getDate() - 7);

  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const [
    attendance14,
    shifts14,
    attendanceTwoWeeks,
    openAttendance,
    pendingLeaves,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: start14 } },
      select: {
        id: true,
        employeeId: true,
        checkIn: true,
        hoursWorked: true,
        employee: { select: { id: true, name: true } },
      },
    }),
    prisma.shift.findMany({
      where: { shiftDate: { gte: start14, lt: startOfToday } },
      select: {
        id: true,
        employeeId: true,
        shiftDate: true,
        startTime: true,
        employee: { select: { id: true, name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { checkIn: { gte: startLastWeek }, checkOut: { not: null } },
      select: {
        employeeId: true,
        checkIn: true,
        hoursWorked: true,
        employee: { select: { id: true, name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { checkOut: null, checkIn: { lt: twelveHoursAgo } },
      select: {
        id: true,
        checkIn: true,
        employee: { select: { id: true, name: true } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { status: "pending", createdAt: { lt: fiveDaysAgo } },
      select: {
        id: true,
        createdAt: true,
        employee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const attByEmpDay = new Map<string, Date>();
  for (const a of attendance14) {
    const k = `${a.employeeId}:${dayKey(a.checkIn)}`;
    const cur = attByEmpDay.get(k);
    if (!cur || a.checkIn < cur) attByEmpDay.set(k, a.checkIn);
  }

  const anomalies: Anomaly[] = [];

  type LateAcc = { count: number; name: string };
  const lateCounts = new Map<number, LateAcc>();
  for (const s of shifts14) {
    const start = parseHHMM(s.startTime);
    if (!start) continue;
    const att = attByEmpDay.get(`${s.employeeId}:${dayKey(s.shiftDate)}`);
    if (!att) continue;
    const scheduled = new Date(s.shiftDate);
    scheduled.setHours(start.h, start.m, 0, 0);
    const diffMin = (att.getTime() - scheduled.getTime()) / 60_000;
    if (diffMin > 10) {
      const cur = lateCounts.get(s.employeeId);
      if (cur) cur.count++;
      else
        lateCounts.set(s.employeeId, {
          count: 1,
          name: s.employee.name,
        });
    }
  }
  for (const [empId, acc] of lateCounts.entries()) {
    if (acc.count > 3) {
      anomalies.push({
        id: `late:${empId}`,
        severity: "warning",
        icon: "clock",
        title: `${acc.name} đi muộn nhiều lần`,
        description: `Đi muộn hơn 10 phút ${acc.count} lần trong 14 ngày qua.`,
        employeeId: empId,
        employeeName: acc.name,
      });
    }
  }

  for (const s of shifts14) {
    if (s.shiftDate < start7) continue;
    const att = attByEmpDay.get(`${s.employeeId}:${dayKey(s.shiftDate)}`);
    if (!att) {
      anomalies.push({
        id: `no-show:${s.employeeId}:${dayKey(s.shiftDate)}`,
        severity: "critical",
        icon: "user-x",
        title: `${s.employee.name} vắng ca`,
        description: `Có ca ngày ${dayKey(s.shiftDate)} nhưng không chấm công.`,
        employeeId: s.employeeId,
        employeeName: s.employee.name,
      });
    }
  }

  type HourAcc = { name: string; thisWeek: number; lastWeek: number };
  const hours = new Map<number, HourAcc>();
  for (const a of attendanceTwoWeeks) {
    const h = Number(a.hoursWorked ?? 0);
    if (h <= 0) continue;
    const acc = hours.get(a.employeeId) ?? {
      name: a.employee.name,
      thisWeek: 0,
      lastWeek: 0,
    };
    if (a.checkIn >= startThisWeek) acc.thisWeek += h;
    else if (a.checkIn >= startLastWeek) acc.lastWeek += h;
    hours.set(a.employeeId, acc);
  }
  for (const [empId, acc] of hours.entries()) {
    if (acc.lastWeek >= 8) {
      const dropPct = (acc.lastWeek - acc.thisWeek) / acc.lastWeek;
      if (dropPct > 0.4) {
        anomalies.push({
          id: `hour-drop:${empId}`,
          severity: "warning",
          icon: "trending-down",
          title: `${acc.name} giảm giờ làm`,
          description: `Tuần này ${acc.thisWeek.toFixed(1)}h, tuần trước ${acc.lastWeek.toFixed(1)}h (giảm ${Math.round(dropPct * 100)}%).`,
          employeeId: empId,
          employeeName: acc.name,
        });
      }
    }
  }

  for (const a of openAttendance) {
    const hoursOpen = Math.round(
      (now.getTime() - a.checkIn.getTime()) / 3_600_000,
    );
    anomalies.push({
      id: `open-attendance:${a.id}`,
      severity: "critical",
      icon: "alert-triangle",
      title: `${a.employee.name} chưa check-out`,
      description: `Đã check-in từ ${hoursOpen} giờ trước nhưng chưa kết ca.`,
      employeeId: a.employee.id,
      employeeName: a.employee.name,
    });
  }

  for (const l of pendingLeaves) {
    const daysOld = Math.floor(
      (now.getTime() - l.createdAt.getTime()) / 86_400_000,
    );
    anomalies.push({
      id: `pending-leave:${l.id}`,
      severity: "info",
      icon: "alert-triangle",
      title: `Đơn nghỉ của ${l.employee.name} chờ duyệt`,
      description: `Đã chờ ${daysOld} ngày — cần xử lý sớm.`,
      employeeId: l.employee.id,
      employeeName: l.employee.name,
    });
  }

  anomalies.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return anomalies.slice(0, MAX_ANOMALIES);
}
