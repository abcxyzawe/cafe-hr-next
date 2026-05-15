import "server-only";
import { prisma } from "./prisma";

export const ANNUAL_LEAVE_QUOTA = 12;
export const SICK_LEAVE_QUOTA = 6;

export type EmployeeLeaveBalance = {
  employeeId: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  annualUsed: number;
  annualRemaining: number;
  sickUsed: number;
  sickRemaining: number;
  /** Months elapsed since Jan 1 of current year, rounded to 1dp. Always >= ~0.03 (first day). */
  monthsElapsed: number;
  /** Days of annual leave consumed per month (annualUsed / max(monthsElapsed, 1)). */
  monthlyUsageRate: number;
  /** Month (1-12) when annual quota will be exhausted at current usage rate; null if not within year. */
  predictedExhaustionMonth: number | null;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function inclusiveDayCount(start: Date, end: Date): number {
  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export async function getAllLeaveBalances(): Promise<EmployeeLeaveBalance[]> {
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      leaveRequests: {
        where: {
          status: "approved",
          startDate: { gte: yearStart, lt: yearEnd },
        },
        select: { type: true, startDate: true, endDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // monthsElapsed = (currentMonth - 1) + (currentDay / daysInCurrentMonth), rounded to 1dp
  const rawMonthsElapsed =
    now.getMonth() + now.getDate() / daysInMonth(year, now.getMonth());
  const monthsElapsed = Math.round(rawMonthsElapsed * 10) / 10;
  const denom = Math.max(monthsElapsed, 1);

  const result: EmployeeLeaveBalance[] = employees.map((e) => {
    let annualUsed = 0;
    let sickUsed = 0;
    for (const lr of e.leaveRequests) {
      const days = inclusiveDayCount(lr.startDate, lr.endDate);
      if (lr.type === "annual") annualUsed += days;
      else if (lr.type === "sick") sickUsed += days;
    }
    const annualRemaining = Math.max(0, ANNUAL_LEAVE_QUOTA - annualUsed);
    const sickRemaining = Math.max(0, SICK_LEAVE_QUOTA - sickUsed);
    const monthlyUsageRate = annualUsed / denom;

    let predictedExhaustionMonth: number | null = null;
    if (monthlyUsageRate > 0) {
      const m = Math.ceil(ANNUAL_LEAVE_QUOTA / monthlyUsageRate);
      if (m <= 12) {
        predictedExhaustionMonth = Math.min(12, Math.max(1, m));
      }
    }

    return {
      employeeId: e.id,
      name: e.name,
      role: e.role,
      avatarUrl: e.avatarUrl,
      annualUsed,
      annualRemaining,
      sickUsed,
      sickRemaining,
      monthsElapsed,
      monthlyUsageRate,
      predictedExhaustionMonth,
    };
  });

  result.sort((a, b) => a.annualRemaining - b.annualRemaining);
  return result;
}
