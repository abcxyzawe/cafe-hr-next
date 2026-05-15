import { NextResponse } from "next/server";
import { SOPS, SOP_CATEGORY_LABEL, type Sop } from "@/lib/sop-catalogue";

export const dynamic = "force-static";
export const runtime = "nodejs";

type SopCategory = Sop["category"];

const VALID_CATEGORIES: ReadonlySet<SopCategory> = new Set<SopCategory>([
  "service",
  "cleaning",
  "safety",
  "cash",
]);

function isSopCategory(value: string | null): value is SopCategory {
  return (
    value !== null && (VALID_CATEGORIES as ReadonlySet<string>).has(value)
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryParam = url.searchParams.get("category");

  if (!isSopCategory(categoryParam)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing or invalid `category` query parameter. Expected one of: service, cleaning, safety, cash.",
        validCategories: Array.from(VALID_CATEGORIES),
      },
      { status: 400 },
    );
  }

  const filtered = SOPS.filter((s) => s.category === categoryParam);

  return NextResponse.json(
    {
      ok: true,
      category: categoryParam,
      categoryLabel: SOP_CATEGORY_LABEL[categoryParam],
      total: filtered.length,
      sops: filtered.map((s) => ({
        id: s.id,
        title: s.title,
        estimatedMinutes: s.estimatedMinutes,
        description: s.description,
        stepsCount: s.steps.length,
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    },
  );
}
