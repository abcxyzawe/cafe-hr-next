import { NextResponse } from "next/server";
import { RECIPES, CATEGORY_LABEL } from "@/lib/recipe-catalogue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];

  return NextResponse.json({
    ok: true,
    recipe: {
      id: recipe.id,
      name: recipe.name,
      difficulty: recipe.difficulty,
      brewTimeSeconds: recipe.brewTimeSeconds,
      ratio: recipe.ratio,
      equipment: recipe.equipment,
      category: recipe.category,
      categoryLabel: CATEGORY_LABEL[recipe.category],
      steps: recipe.steps,
    },
  });
}
