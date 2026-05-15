import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SHIFT_TYPES = new Set(["morning", "afternoon", "evening"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parseDate(v: string | null): Date | null {
  if (!v || !ISO_DATE.test(v)) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  const shiftType = url.searchParams.get("shiftType");
  const employeeId = parsePositiveInt(url.searchParams.get("employeeId"));
  const limitRaw = parsePositiveInt(url.searchParams.get("limit")) ?? 100;
  const limit = clamp(limitRaw, 1, 500);
  const cursor = parsePositiveInt(url.searchParams.get("cursor"));

  const where: Prisma.ShiftWhereInput = {};
  if (from || to) {
    where.shiftDate = {};
    if (from) where.shiftDate.gte = from;
    if (to) {
      const next = new Date(to);
      next.setDate(next.getDate() + 1);
      where.shiftDate.lt = next;
    }
  }
  if (shiftType && VALID_SHIFT_TYPES.has(shiftType)) {
    where.shiftType = shiftType as Prisma.ShiftWhereInput["shiftType"];
  }
  if (employeeId !== null) {
    where.employeeId = employeeId;
  }
  if (cursor !== null) {
    where.id = { lt: cursor };
  }

  try {
    const rows = await prisma.shift.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((s) => ({
      id: s.id,
      shiftDate: s.shiftDate.toISOString().slice(0, 10),
      shiftType: s.shiftType,
      startTime: s.startTime,
      endTime: s.endTime,
      employee: s.employee,
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
