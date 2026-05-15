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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");

  const where: { id?: { in: number[] } } = {};
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length > 0) where.id = { in: ids };
  }

  const rows = await prisma.employee.findMany({
    where,
    orderBy: { id: "asc" },
    take: 10000,
  });

  const header = [
    "id",
    "name",
    "role",
    "phone",
    "email",
    "hourly_rate",
    "date_of_birth",
    "created_at",
  ];
  const lines = [header.join(",")];
  for (const e of rows) {
    lines.push(
      [
        e.id,
        e.name,
        ROLE_LABELS[e.role] ?? e.role,
        e.phone ?? "",
        e.email ?? "",
        Number(e.hourlyRate),
        e.dateOfBirth ? new Date(e.dateOfBirth).toISOString().slice(0, 10) : "",
        new Date(e.createdAt).toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = "\ufeff" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  const fname = idsParam
    ? `employees-selected-${today}.csv`
    : `employees-${today}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
