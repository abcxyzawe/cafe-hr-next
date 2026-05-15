import { NextResponse } from "next/server";
import { INVENTORY_ITEMS } from "@/lib/inventory-presets";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      total: INVENTORY_ITEMS.length,
      items: INVENTORY_ITEMS.map((it) => ({
        id: it.id,
        name: it.name,
        unit: it.unit,
        defaultQty: it.defaultQty,
        threshold: it.threshold,
        iconName: it.iconName,
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
