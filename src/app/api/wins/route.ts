import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RawWin = {
  id?: unknown;
  emoji?: unknown;
  text?: unknown;
  authorName?: unknown;
  createdAt?: unknown;
  likes?: unknown;
};

type ParsedWin = {
  id: string;
  emoji: string;
  text: string;
  authorName: string | null;
  createdAt: string;
  likes: number;
};

function parseWins(input: unknown): { wins: ParsedWin[]; rejected: number } {
  if (!Array.isArray(input)) return { wins: [], rejected: 0 };
  const wins: ParsedWin[] = [];
  let rejected = 0;
  for (const raw of input as RawWin[]) {
    if (!raw || typeof raw !== "object") {
      rejected++;
      continue;
    }
    const id = typeof raw.id === "string" && raw.id.length > 0 ? raw.id : null;
    const emoji = typeof raw.emoji === "string" && raw.emoji.length > 0 ? raw.emoji : null;
    const text = typeof raw.text === "string" ? raw.text.trim() : "";
    const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : null;
    if (!id || !emoji || text.length === 0 || !createdAt) {
      rejected++;
      continue;
    }
    const likesNum = Number(raw.likes ?? 0);
    wins.push({
      id,
      emoji,
      text: text.slice(0, 200),
      authorName: typeof raw.authorName === "string" && raw.authorName.length > 0
        ? raw.authorName.slice(0, 60)
        : null,
      createdAt,
      likes: Number.isFinite(likesNum) && likesNum >= 0 ? Math.floor(likesNum) : 0,
    });
  }
  return { wins, rejected };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "POST a JSON array of wins to validate + echo. /wins page persists to localStorage; this endpoint is a parsing utility.",
    expectedShape: {
      id: "string (uuid)",
      emoji: "string (single emoji)",
      text: "string ≤200 chars",
      authorName: "string | null",
      createdAt: "ISO string",
      likes: "number ≥ 0",
    },
  });
}

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const { wins, rejected } = parseWins(body);
  const totalLikes = wins.reduce((sum, w) => sum + w.likes, 0);
  const emojiTally = new Map<string, number>();
  for (const w of wins) {
    emojiTally.set(w.emoji, (emojiTally.get(w.emoji) ?? 0) + 1);
  }
  const topEmoji = Array.from(emojiTally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji, count]) => ({ emoji, count }));

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    summary: {
      validCount: wins.length,
      rejectedCount: rejected,
      totalLikes,
      topEmoji,
    },
    wins,
  });
}
