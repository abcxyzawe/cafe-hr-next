import "server-only";
import { prisma } from "./prisma";

export type SidebarBadges = {
  pendingLeaves: number;
  overdueTasks: number;
  openAttendance: number;
  birthdaysToday: number;
};

/**
 * Cheap aggregate counts shown as pills on sidebar nav items.
 * All 4 queries run in parallel; total typically <30ms.
 */
export async function getSidebarBadges(): Promise<SidebarBadges> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingLeaves, overdueTasks, openAttendance, birthdayEmps] =
      await Promise.all([
        prisma.leaveRequest.count({ where: { status: "pending" } }),
        prisma.task.count({
          where: { completedAt: null, dueDate: { lt: today, not: null } },
        }),
        prisma.attendance.count({ where: { checkOut: null } }),
        prisma.employee.findMany({
          where: { dateOfBirth: { not: null } },
          select: { dateOfBirth: true },
        }),
      ]);

    const birthdaysToday = birthdayEmps.filter((e) => {
      if (!e.dateOfBirth) return false;
      const dob = new Date(e.dateOfBirth);
      return (
        dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()
      );
    }).length;

    return {
      pendingLeaves,
      overdueTasks,
      openAttendance,
      birthdaysToday,
    };
  } catch {
    return {
      pendingLeaves: 0,
      overdueTasks: 0,
      openAttendance: 0,
      birthdaysToday: 0,
    };
  }
}
