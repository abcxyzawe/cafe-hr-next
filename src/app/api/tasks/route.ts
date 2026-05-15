import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUS = new Set(["open", "done"]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parsePositiveInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const assignedTo = parsePositiveInt(url.searchParams.get("assignedTo"));
  const limitRaw = parsePositiveInt(url.searchParams.get("limit")) ?? 50;
  const limit = clamp(limitRaw, 1, 200);
  const cursor = parsePositiveInt(url.searchParams.get("cursor"));

  const where: Prisma.TaskWhereInput = {};
  if (status && VALID_STATUS.has(status)) {
    if (status === "open") {
      where.completedAt = null;
    } else {
      where.completedAt = { not: null };
    }
  }
  if (assignedTo !== null) {
    where.assigneeId = assignedTo;
  }
  if (cursor !== null) {
    where.id = { lt: cursor };
  }

  try {
    const rows = await prisma.task.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      include: {
        assignee: { select: { id: true, name: true, role: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: (t.completedAt === null ? "open" : "done") as "open" | "done",
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      assignee: t.assignee
        ? { id: t.assignee.id, name: t.assignee.name, role: t.assignee.role }
        : null,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 300) : String(e),
      },
      { status: 503 },
    );
  }
}
