import { NextResponse } from "next/server";
import { SOPS, SOP_CATEGORY_LABEL } from "@/lib/sop-catalogue";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      total: SOPS.length,
      categories: SOP_CATEGORY_LABEL,
      sops: SOPS.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        categoryLabel: SOP_CATEGORY_LABEL[s.category],
        estimatedMinutes: s.estimatedMinutes,
        description: s.description,
        steps: s.steps.map((step) => ({
          text: step.text,
          warning: Boolean(step.warning),
        })),
        tips: s.tips ?? [],
      })),
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
