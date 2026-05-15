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

  const where: Prisma.DailyQuoteWhereInput = {};
  if (cursor !== null) {
    where.id = { lt: cursor };
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.dailyQuote.findMany({
        where,
        orderBy: { date: "desc" },
        take: limit + 1,
        select: {
          id: true,
          date: true,
          content: true,
          model: true,
          createdAt: true,
        },
      }),
      prisma.dailyQuote.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((q) => ({
      id: q.id,
      date: q.date.toISOString().slice(0, 10),
      content: q.content,
      model: q.model,
      createdAt: q.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
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
