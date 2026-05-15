import { NextResponse } from "next/server";
import { VN_HOLIDAYS_2025_2027 } from "@/lib/holidays";

export const dynamic = "force-static";

const VALID_YEARS = new Set([2025, 2026, 2027]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const yearRaw = url.searchParams.get("year");
  const yearNum = yearRaw ? Number(yearRaw) : new Date().getFullYear();
  const year = VALID_YEARS.has(yearNum) ? yearNum : 2026;

  const items = VN_HOLIDAYS_2025_2027.filter((h) =>
    h.iso.startsWith(`${year}-`),
  );

  return NextResponse.json(
    {
      ok: true,
      year,
      total: items.length,
      counts: {
        public: items.filter((h) => h.type === "public").length,
        observed: items.filter((h) => h.type === "observed").length,
      },
      items,
    },
    {
      headers: {
        "cache-control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
