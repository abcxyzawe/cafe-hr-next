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
  if (!sess || sess.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (fromStr || toStr) where.createdAt = {};
  if (fromStr && !isNaN(Date.parse(fromStr))) where.createdAt!.gte = new Date(fromStr);
  if (toStr && !isNaN(Date.parse(toStr))) where.createdAt!.lte = new Date(toStr);

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { user: { select: { email: true, name: true } } },
  });

  const header = [
    "id",
    "timestamp",
    "user_email",
    "user_name",
    "action",
    "entity_type",
    "entity_id",
    "summary",
  ];
  const lines = [header.join(",")];
  for (const l of logs) {
    lines.push(
      [
        l.id,
        new Date(l.createdAt).toISOString(),
        l.user?.email ?? "",
        l.user?.name ?? "",
        l.action,
        l.entityType ?? "",
        l.entityId ?? "",
        l.summary,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = "\ufeff" + lines.join("\r\n");
  const fname = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
