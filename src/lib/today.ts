import "server-only";
import { prisma } from "./prisma";

export type TodaySnapshot = {
  onLeave: Array<{
    id: number;
    name: string;
    avatarUrl: string | null;
    type: string;
  }>;
  onShift: Array<{
    id: number;
    name: string;
    avatarUrl: string | null;
    role: string;
    startedAt: Date;
  }>;
  birthdays: Array<{
    id: number;
    name: string;
    avatarUrl: string | null;
    turningAge: number;
  }>;
  shiftsToday: number;
};

export async function getTodaySnapshot(): Promise<TodaySnapshot> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const todayDateOnly = new Date(startOfDay);

  const [leaves, openAttendances, employees, shiftsToday] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lte: todayDateOnly },
        endDate: { gte: todayDateOnly },
      },
      include: {
        employee: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    }),
    prisma.attendance.findMany({
      where: { checkOut: null },
      include: {
        employee: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
      orderBy: { checkIn: "asc" },
    }),
    prisma.employee.findMany({
      where: { dateOfBirth: { not: null } },
      select: { id: true, name: true, avatarUrl: true, dateOfBirth: true },
    }),
    prisma.shift.count({
      where: { shiftDate: { gte: startOfDay, lt: endOfDay } },
    }),
  ]);

  const onLeave = leaves.map((l) => ({
    id: l.employee.id,
    name: l.employee.name,
    avatarUrl: l.employee.avatarUrl,
    type: l.type,
  }));

  const onShift = openAttendances.map((a) => ({
    id: a.employee.id,
    name: a.employee.name,
    avatarUrl: a.employee.avatarUrl,
    role: a.employee.role,
    startedAt: a.checkIn,
  }));

  // Birthdays today (month + day match)
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const birthdays = employees
    .filter((e) => {
      if (!e.dateOfBirth) return false;
      const dob = new Date(e.dateOfBirth);
      return dob.getMonth() === todayMonth && dob.getDate() === todayDate;
    })
    .map((e) => {
      const dob = new Date(e.dateOfBirth!);
      const turningAge = now.getFullYear() - dob.getFullYear();
      return {
        id: e.id,
        name: e.name,
        avatarUrl: e.avatarUrl,
        turningAge,
      };
    });

  return { onLeave, onShift, birthdays, shiftsToday };
}
