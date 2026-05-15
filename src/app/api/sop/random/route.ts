import { NextResponse } from "next/server";
import { SOPS, SOP_CATEGORY_LABEL } from "@/lib/sop-catalogue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sop = SOPS[Math.floor(Math.random() * SOPS.length)];

  return NextResponse.json({
    ok: true,
    sop: {
      id: sop.id,
      title: sop.title,
      category: sop.category,
      categoryLabel: SOP_CATEGORY_LABEL[sop.category],
      estimatedMinutes: sop.estimatedMinutes,
      description: sop.description,
      steps: sop.steps.map((step) => ({
        text: step.text,
        warning: Boolean(step.warning),
      })),
      tips: sop.tips ?? [],
    },
  });
}
