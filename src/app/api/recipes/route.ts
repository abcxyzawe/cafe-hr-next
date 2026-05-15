import { NextResponse } from "next/server";
import { RECIPES, CATEGORY_LABEL } from "@/lib/recipe-catalogue";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      total: RECIPES.length,
      categories: CATEGORY_LABEL,
      recipes: RECIPES.map((r) => ({
        id: r.id,
        name: r.name,
        difficulty: r.difficulty,
        brewTimeSeconds: r.brewTimeSeconds,
        ratio: r.ratio,
        equipment: r.equipment,
        category: r.category,
        categoryLabel: CATEGORY_LABEL[r.category],
        steps: r.steps,
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
