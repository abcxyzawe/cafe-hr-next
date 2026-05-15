import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseTags, stripTagsMarker } from "@/lib/task-tags";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { assignee: { select: { name: true } } },
  });

  const header = [
    "id",
    "title",
    "description",
    "tags",
    "priority",
    "dueDate",
    "assigneeId",
    "assigneeName",
    "completed",
    "createdAt",
  ];
  const lines = [header.join(",")];
  for (const t of rows) {
    lines.push(
      [
        t.id,
        t.title,
        stripTagsMarker(t.description),
        parseTags(t.description).join(", "),
        t.priority,
        t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
        t.assigneeId,
        t.assignee.name,
        t.completedAt ? "true" : "false",
        new Date(t.createdAt).toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = "\ufeff" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  const fname = `cong-viec-${today}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
