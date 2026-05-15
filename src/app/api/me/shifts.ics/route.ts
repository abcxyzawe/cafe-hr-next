import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  morning: { start: "06:00", end: "11:00" },
  afternoon: { start: "11:00", end: "16:00" },
  evening: { start: "16:00", end: "22:00" },
};

function fmtDt(date: Date, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}00`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET() {
  const sess = await getSession();
  if (!sess?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findFirst({
    where: { email: sess.email },
    select: { id: true, name: true },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "no employee profile linked to this account" },
      { status: 404 },
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 60);

  const shifts = await prisma.shift.findMany({
    where: {
      employeeId: employee.id,
      shiftDate: { gte: today, lt: horizon },
    },
    orderBy: { shiftDate: "asc" },
    select: {
      id: true,
      shiftDate: true,
      shiftType: true,
      startTime: true,
      endTime: true,
    },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cafe HR//Shifts//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Ca làm - ${escapeIcs(employee.name)}`,
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
  ];

  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;

  for (const s of shifts) {
    const fallback = s.shiftType ? SHIFT_TIMES[s.shiftType] : null;
    const start = s.startTime ?? fallback?.start ?? "08:00";
    const end = s.endTime ?? fallback?.end ?? "12:00";
    const summary = s.shiftType
      ? `Ca ${s.shiftType === "morning" ? "sáng" : s.shiftType === "afternoon" ? "chiều" : "tối"}`
      : "Ca làm";
    lines.push(
      "BEGIN:VEVENT",
      `UID:cafe-hr-shift-${s.id}@cafe-hr`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${fmtDt(s.shiftDate, start)}`,
      `DTEND:${fmtDt(s.shiftDate, end)}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(`Cafe HR · ${employee.name}`)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="cafe-hr-shifts.ics"`,
      "cache-control": "no-store",
    },
  });
}
