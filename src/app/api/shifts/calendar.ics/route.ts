import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcs, combineDateTime } from "@/lib/ical";

export const dynamic = "force-dynamic";

const SHIFT_LABELS: Record<string, string> = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  evening: "Ca tối",
};

const SHIFT_DEFAULT_TIMES: Record<string, [string, string]> = {
  morning: ["07:00", "12:00"],
  afternoon: ["12:00", "17:00"],
  evening: ["17:00", "22:00"],
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const employeeIdStr = url.searchParams.get("employee");
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  const where: {
    employeeId?: number;
    shiftDate?: { gte?: Date; lt?: Date };
  } = {};

  let calName = "Cafe HR — Lịch ca";
  if (employeeIdStr && /^\d+$/.test(employeeIdStr)) {
    const id = Number(employeeIdStr);
    where.employeeId = id;
    const emp = await prisma.employee.findUnique({
      where: { id },
      select: { name: true },
    });
    if (emp) calName = `Cafe HR — Lịch ca ${emp.name}`;
  }

  if (fromStr && !isNaN(Date.parse(fromStr))) {
    where.shiftDate = { ...(where.shiftDate || {}), gte: new Date(fromStr) };
  }
  if (toStr && !isNaN(Date.parse(toStr))) {
    const toEnd = new Date(toStr);
    toEnd.setDate(toEnd.getDate() + 1);
    where.shiftDate = { ...(where.shiftDate || {}), lt: toEnd };
  }
  if (!where.shiftDate) {
    // Default range: 60 days back, 90 days forward
    const back = new Date();
    back.setDate(back.getDate() - 60);
    const forward = new Date();
    forward.setDate(forward.getDate() + 90);
    where.shiftDate = { gte: back, lt: forward };
  }

  const shifts = await prisma.shift.findMany({
    where,
    orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
    take: 1000,
    include: { employee: { select: { name: true, role: true } } },
  });

  const events = shifts.map((s) => {
    const type = s.shiftType ?? "morning";
    const defaults = SHIFT_DEFAULT_TIMES[type];
    const start = combineDateTime(s.shiftDate, s.startTime, defaults[0]);
    const end = combineDateTime(s.shiftDate, s.endTime, defaults[1]);
    return {
      uid: `shift-${s.id}@cafe-hr`,
      start,
      end,
      summary: `${SHIFT_LABELS[type] ?? type} — ${s.employee.name}`,
      description: `Vai trò: ${s.employee.role}\nGiờ: ${s.startTime ?? defaults[0]}–${s.endTime ?? defaults[1]}`,
      location: "Cafe HR",
    };
  });

  const ics = buildIcs({ calendarName: calName, events });
  const fname = employeeIdStr
    ? `cafe-hr-shifts-${employeeIdStr}.ics`
    : `cafe-hr-shifts.ics`;
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
