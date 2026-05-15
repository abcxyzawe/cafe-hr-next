import { NextResponse } from "next/server";
import { CHANGELOG } from "@/lib/changelog-data";

export const dynamic = "force-static";

export async function GET() {
  const totalEntries = CHANGELOG.length;
  const totalItems = CHANGELOG.reduce(
    (sum, entry) => sum + entry.highlights.length,
    0,
  );
  const latest = CHANGELOG[0] ?? null;

  return NextResponse.json(
    {
      ok: true,
      totalEntries,
      totalItems,
      latestVersion: latest?.version ?? null,
      latestDate: latest?.date ?? null,
      entries: CHANGELOG.map((entry) => ({
        version: entry.version,
        date: entry.date,
        highlights: entry.highlights.map((h) => ({
          kind: h.kind,
          title: h.title,
          description: h.description,
        })),
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}
