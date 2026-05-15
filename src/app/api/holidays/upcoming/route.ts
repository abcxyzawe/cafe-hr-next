import { NextResponse } from "next/server";
import { VN_HOLIDAYS_2025_2027 } from "@/lib/holidays";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysRaw = url.searchParams.get("days");
  const daysNum = daysRaw ? Number(daysRaw) : 30;
  const days = Number.isFinite(daysNum) ? clamp(Math.floor(daysNum), 1, 365) : 30;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayIso = toIsoLocal(now);

  const items = VN_HOLIDAYS_2025_2027.filter((h) => {
    if (h.iso < todayIso) return false;
    return diffDays(todayIso, h.iso) <= days;
  })
    .map((h) => ({
      ...h,
      daysUntil: diffDays(todayIso, h.iso),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return NextResponse.json(
    {
      ok: true,
      windowDays: days,
      asOf: now.toISOString(),
      total: items.length,
      next: items[0] ?? null,
      items,
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
