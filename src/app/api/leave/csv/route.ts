import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const validStatus = ["pending", "approved", "rejected", "cancelled"];

  const where: { status?: "pending" | "approved" | "rejected" | "cancelled" } = {};
  if (status && validStatus.includes(status)) {
    where.status = status as "pending" | "approved" | "rejected" | "cancelled";
  }

  const rows = await prisma.leaveRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 10000,
    include: { employee: { select: { name: true } } },
  });

  const header = [
    "id",
    "employeeId",
    "employeeName",
    "type",
    "startDate",
    "endDate",
    "days",
    "status",
    "reason",
    "decidedBy",
    "decidedAt",
    "createdAt",
  ];
  const lines = [header.join(",")];
  for (const l of rows) {
    const days =
      Math.floor(
        (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) /
          86400000,
      ) + 1;
    lines.push(
      [
        l.id,
        l.employeeId,
        l.employee.name,
        l.type,
        new Date(l.startDate).toISOString().slice(0, 10),
        new Date(l.endDate).toISOString().slice(0, 10),
        days,
        l.status,
        l.reason ?? "",
        l.decidedById ?? "",
        l.decidedAt ? new Date(l.decidedAt).toISOString() : "",
        new Date(l.createdAt).toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = "\ufeff" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  const fname = `nghi-phep-${today}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
