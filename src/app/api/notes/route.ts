import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const limitRaw = parsePositiveInt(url.searchParams.get("limit")) ?? 50;
  const limit = clamp(limitRaw, 1, 200);
  const cursor = parsePositiveInt(url.searchParams.get("cursor"));
  const employeeId = parsePositiveInt(url.searchParams.get("employeeId"));
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where: Prisma.EmployeeNoteWhereInput = {};
  if (employeeId !== null) {
    where.employeeId = employeeId;
  }
  if (q.length > 0) {
    where.content = { contains: q, mode: "insensitive" };
  }
  if (cursor !== null) {
    where.id = { lt: cursor };
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.employeeNote.findMany({
        where,
        orderBy: { id: "desc" },
        take: limit + 1,
        select: {
          id: true,
          content: true,
          authorName: true,
          createdAt: true,
          employee: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.employeeNote.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const items = sliced.map((n) => ({
      id: n.id,
      content: n.content,
      authorName: n.authorName,
      employee: {
        id: n.employee.id,
        name: n.employee.name,
        role: n.employee.role,
      },
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      total,
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
