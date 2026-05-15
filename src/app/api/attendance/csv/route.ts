import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const employeeIdStr = url.searchParams.get("employee");

  const where: {
    employeeId?: number;
    checkIn?: { gte?: Date; lt?: Date };
  } = {};
  if (employeeIdStr && /^\d+$/.test(employeeIdStr)) {
    where.employeeId = Number(employeeIdStr);
  }
  if (fromStr || toStr) where.checkIn = {};
  if (fromStr && !isNaN(Date.parse(fromStr))) where.checkIn!.gte = new Date(fromStr);
  if (toStr && !isNaN(Date.parse(toStr))) {
    const d = new Date(toStr);
    d.setDate(d.getDate() + 1);
    where.checkIn!.lt = d;
  }

  const rows = await prisma.attendance.findMany({
    where,
    orderBy: { checkIn: "desc" },
    take: 10000,
    include: { employee: { select: { name: true, role: true } } },
  });

  const header = [
    "id",
    "employee_id",
    "employee_name",
    "role",
    "check_in",
    "check_out",
    "hours_worked",
    "status",
  ];
  const lines = [header.join(",")];
  for (const a of rows) {
    lines.push(
      [
        a.id,
        a.employeeId,
        a.employee.name,
        a.employee.role,
        new Date(a.checkIn).toISOString(),
        a.checkOut ? new Date(a.checkOut).toISOString() : "",
        a.hoursWorked ?? "",
        a.checkOut ? "completed" : "open",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = "\ufeff" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
