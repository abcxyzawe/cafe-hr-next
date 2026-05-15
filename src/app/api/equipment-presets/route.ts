import { NextResponse } from "next/server";
import { EQUIPMENT_ITEMS } from "@/lib/equipment-presets";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      total: EQUIPMENT_ITEMS.length,
      items: EQUIPMENT_ITEMS.map((it) => ({
        id: it.id,
        name: it.name,
        category: it.category,
        intervalDays: it.intervalDays,
        iconName: it.iconName,
        description: it.description,
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
