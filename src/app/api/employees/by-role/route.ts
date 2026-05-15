import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  try {
    const employees = await prisma.employee.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        email: true,
        phone: true,
        hourlyRate: true,
      },
    });

    const groups: Record<
      string,
      Array<{
        id: number;
        name: string;
        avatarUrl: string | null;
        email: string | null;
        phone: string | null;
        hourlyRate: number;
      }>
    > = {};

    for (const e of employees) {
      const list = groups[e.role] ?? (groups[e.role] = []);
      list.push({
        id: e.id,
        name: e.name,
        avatarUrl: e.avatarUrl,
        email: e.email,
        phone: e.phone,
        hourlyRate: Number(e.hourlyRate),
      });
    }

    return NextResponse.json({
      ok: true,
      asOf: new Date().toISOString(),
      total: employees.length,
      counts: Object.fromEntries(
        Object.entries(groups).map(([role, list]) => [role, list.length]),
      ),
      groups,
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
