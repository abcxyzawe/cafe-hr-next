import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { gatherStandupFacts, getCachedStandup } from "@/lib/standup-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const today = new Date();

  try {
    const facts = await gatherStandupFacts(today);
    const cached = getCachedStandup(today);

    return NextResponse.json({
      ok: true,
      generatedAt: today.toISOString(),
      facts,
      aiSummary: cached
        ? {
            content: cached.content,
            generatedAt: cached.generatedAt.toISOString(),
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 300) : String(e),
      },
      { status: 503 },
    );
  }
}
