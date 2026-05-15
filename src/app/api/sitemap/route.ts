import { NextResponse } from "next/server";
import {
  SITEMAP_ENTRIES,
  SITEMAP_CATEGORY_META,
} from "@/lib/sitemap-catalogue";

export const dynamic = "force-static";

export async function GET() {
  const counts: Record<string, number> = {};
  for (const entry of SITEMAP_ENTRIES) {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  }

  return NextResponse.json(
    {
      ok: true,
      total: SITEMAP_ENTRIES.length,
      categories: Object.fromEntries(
        Object.entries(SITEMAP_CATEGORY_META).map(([key, meta]) => [
          key,
          { label: meta.label, count: counts[key] ?? 0 },
        ]),
      ),
      entries: SITEMAP_ENTRIES.map((e) => ({
        href: e.href,
        label: e.label,
        description: e.description,
        category: e.category,
        adminOnly: Boolean(e.adminOnly),
        iconName: e.iconName,
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
