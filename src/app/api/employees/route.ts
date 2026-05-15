import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_ROLES = new Set(["barista", "server", "cashier", "manager"]);

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
  const role = url.searchParams.get("role");
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where: Prisma.EmployeeWhereInput = {};
  if (role && VALID_ROLES.has(role)) {
    where.role = role as Prisma.EmployeeWhereInput["role"];
  }
  if (q.length > 0) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (cursor !== null) {
    where.id = { lt: cursor };
  }

  try {
    const rows = await prisma.employee.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        phone: true,
        avatarUrl: true,
        hourlyRate: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      email: e.email,
      phone: e.phone,
      avatarUrl: e.avatarUrl,
      hourlyRate: Number(e.hourlyRate),
      dateOfBirth: e.dateOfBirth ? e.dateOfBirth.toISOString().slice(0, 10) : null,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      total: await prisma.employee.count({ where }),
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
