import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  const periodParam = url.searchParams.get("period");
  const period =
    periodParam && PERIOD_RE.test(periodParam) ? periodParam : currentPeriod();

  if (periodParam && !PERIOD_RE.test(periodParam)) {
    return NextResponse.json(
      { ok: false, error: "invalid period; expected YYYY-MM" },
      { status: 400 },
    );
  }

  try {
    const rows = await prisma.payroll.findMany({
      where: { period },
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { employee: { name: "asc" } },
    });

    const items = rows.map((r) => ({
      employeeId: r.employee.id,
      name: r.employee.name,
      role: r.employee.role,
      hours: Number(r.totalHours),
      pay: Number(r.totalPay),
      generatedAt: r.generatedAt.toISOString(),
    }));

    let totalHours = 0;
    let totalPay = 0;
    for (const it of items) {
      totalHours += it.hours;
      totalPay += it.pay;
    }

    return NextResponse.json({
      ok: true,
      period,
      totals: {
        employees: items.length,
        hours: totalHours,
        pay: totalPay,
      },
      items,
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
