import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/search-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await buildSearchIndex();
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
