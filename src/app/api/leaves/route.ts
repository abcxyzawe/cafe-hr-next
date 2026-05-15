import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUS = new Set(["pending", "approved", "rejected", "cancelled"]);
const VALID_TYPE = new Set(["annual", "sick", "unpaid", "other"]);

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
  const type = url.searchParams.get("type");
  const employeeId = parsePositiveInt(url.searchParams.get("employeeId"));
  const limitRaw = parsePositiveInt(url.searchParams.get("limit")) ?? 50;
  const limit = clamp(limitRaw, 1, 200);
  const cursor = parsePositiveInt(url.searchParams.get("cursor"));

  const where: Prisma.LeaveRequestWhereInput = {};
  if (status && VALID_STATUS.has(status)) {
    where.status = status as Prisma.LeaveRequestWhereInput["status"];
  }
  if (type && VALID_TYPE.has(type)) {
    where.type = type as Prisma.LeaveRequestWhereInput["type"];
  }
  if (employeeId !== null) {
    where.employeeId = employeeId;
  }
  if (cursor !== null) {
    where.id = { lt: cursor };
  }

  try {
    const rows = await prisma.leaveRequest.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((l) => ({
      id: l.id,
      employee: l.employee,
      type: l.type,
      status: l.status,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      reason: l.reason,
      decidedAt: l.decidedAt ? l.decidedAt.toISOString() : null,
      createdAt: l.createdAt.toISOString(),
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
