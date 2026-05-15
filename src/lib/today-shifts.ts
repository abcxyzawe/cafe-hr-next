import "server-only";
import { prisma } from "./prisma";

export type ShiftSlot = "morning" | "afternoon" | "evening";

export type TodayShiftAssignee = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  startTime: string | null;
  endTime: string | null;
  // Whether this employee currently has an open attendance (clocked in)
  active: boolean;
};

export type TodayShiftSlotData = {
  slot: ShiftSlot;
  label: string;
  timeRange: string;
  assignees: TodayShiftAssignee[];
};

const SLOT_META: Record<ShiftSlot, { label: string; timeRange: string }> = {
  morning: { label: "Sáng", timeRange: "07:00 – 12:00" },
  afternoon: { label: "Chiều", timeRange: "12:00 – 17:00" },
  evening: { label: "Tối", timeRange: "17:00 – 22:00" },
};

export async function getTodayShiftSlots(): Promise<TodayShiftSlotData[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [shifts, openAttendances] = await Promise.all([
    prisma.shift.findMany({
      where: { shiftDate: { gte: startOfDay, lt: endOfDay } },
      include: {
        employee: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
      orderBy: [{ shiftType: "asc" }, { startTime: "asc" }],
    }),
    prisma.attendance.findMany({
      where: { checkOut: null },
      select: { employeeId: true },
    }),
  ]);

  const activeIds = new Set(openAttendances.map((a) => a.employeeId));
  const slots: ShiftSlot[] = ["morning", "afternoon", "evening"];

  return slots.map((slot) => {
    const meta = SLOT_META[slot];
    const assignees: TodayShiftAssignee[] = shifts
      .filter((s) => s.shiftType === slot)
      .map((s) => ({
        id: s.employee.id,
        name: s.employee.name,
        avatarUrl: s.employee.avatarUrl,
        role: s.employee.role,
        startTime: s.startTime,
        endTime: s.endTime,
        active: activeIds.has(s.employee.id),
      }));
    return { slot, label: meta.label, timeRange: meta.timeRange, assignees };
  });
}
