import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { upcomingBirthdays } from "@/lib/birthday";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parseDays(v: string | null): number {
  if (!v) return 30;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 30;
  return clamp(Math.floor(n), 1, 365);
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
  const days = parseDays(url.searchParams.get("days"));

  try {
    const rows = await upcomingBirthdays(days);

    const asOf = new Date();
    asOf.setHours(0, 0, 0, 0);

    const items = rows.map((b) => ({
      employeeId: b.id,
      name: b.name,
      role: b.role,
      avatarUrl: b.avatarUrl,
      dateOfBirth: b.dateOfBirth.toISOString().slice(0, 10),
      upcomingDate: b.upcomingDate.toISOString().slice(0, 10),
      daysUntil: b.daysUntil,
      turningAge: b.turningAge,
    }));

    return NextResponse.json({
      ok: true,
      windowDays: days,
      asOf: asOf.toISOString(),
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
