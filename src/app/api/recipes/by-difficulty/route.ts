import { NextResponse } from "next/server";
import { RECIPES, CATEGORY_LABEL, type Recipe } from "@/lib/recipe-catalogue";

export const dynamic = "force-static";
export const runtime = "nodejs";

type Difficulty = Recipe["difficulty"];

const VALID_LEVELS: ReadonlySet<Difficulty> = new Set<Difficulty>([
  "easy",
  "medium",
  "hard",
]);

function isDifficulty(value: string | null): value is Difficulty {
  return value !== null && (VALID_LEVELS as ReadonlySet<string>).has(value);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const levelParam = url.searchParams.get("level");

  if (!isDifficulty(levelParam)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing or invalid `level` query parameter. Expected one of: easy, medium, hard.",
        validLevels: Array.from(VALID_LEVELS),
      },
      { status: 400 },
    );
  }

  const filtered = RECIPES.filter((r) => r.difficulty === levelParam);

  return NextResponse.json(
    {
      ok: true,
      level: levelParam,
      total: filtered.length,
      recipes: filtered.map((r) => ({
        id: r.id,
        name: r.name,
        difficulty: r.difficulty,
        brewTimeSeconds: r.brewTimeSeconds,
        ratio: r.ratio,
        equipment: r.equipment,
        category: r.category,
        categoryLabel: CATEGORY_LABEL[r.category],
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=3600",
      },
    },
  );
}
