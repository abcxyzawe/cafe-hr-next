import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ period: string }> },
) {
  const { period } = await params;
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Invalid period (use YYYY-MM)" }, { status: 400 });
  }

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const attendance = await prisma.attendance.findMany({
    where: { checkIn: { gte: start, lt: end }, checkOut: { not: null } },
    select: { employeeId: true, hoursWorked: true },
  });

  const hoursByEmp = new Map<number, number>();
  for (const a of attendance) {
    hoursByEmp.set(
      a.employeeId,
      (hoursByEmp.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0),
    );
  }

  const header = ["id", "name", "role", "phone", "email", "hourly_rate", "total_hours", "total_pay"];
  const lines = [header.join(",")];
  let totalHours = 0;
  let totalPay = 0;

  for (const e of employees) {
    const hours = Number((hoursByEmp.get(e.id) ?? 0).toFixed(2));
    const rate = Number(e.hourlyRate);
    const pay = Number((hours * rate).toFixed(2));
    totalHours += hours;
    totalPay += pay;
    lines.push(
      [
        e.id,
        e.name,
        ROLE_LABELS[e.role] ?? e.role,
        e.phone ?? "",
        e.email ?? "",
        rate,
        hours,
        pay,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  lines.push(
    ["", "TỔNG", "", "", "", "", totalHours.toFixed(2), totalPay.toFixed(2)]
      .map(csvEscape)
      .join(","),
  );

  // UTF-8 BOM so Excel opens Vietnamese correctly
  const body = "\ufeff" + lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bang-luong-${period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
