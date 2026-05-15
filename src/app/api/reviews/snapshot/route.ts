import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_RATINGS = new Set([1, 2, 3, 4, 5]);
const VALID_SOURCES = new Set(["in-store", "google", "fb"]);

type ParsedReview = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  customerName: string;
  source: "in-store" | "google" | "fb";
  createdAt: string;
};

function parseReviews(input: unknown): {
  reviews: ParsedReview[];
  rejected: number;
} {
  if (!Array.isArray(input)) return { reviews: [], rejected: 0 };
  const reviews: ParsedReview[] = [];
  let rejected = 0;
  for (const raw of input as Array<Record<string, unknown>>) {
    if (!raw || typeof raw !== "object") {
      rejected++;
      continue;
    }
    const ratingNum = Number(raw.rating);
    if (!VALID_RATINGS.has(ratingNum)) {
      rejected++;
      continue;
    }
    const id = typeof raw.id === "string" && raw.id.length > 0 ? raw.id : null;
    const createdAt =
      typeof raw.createdAt === "string" && raw.createdAt.length > 0
        ? raw.createdAt
        : null;
    if (!id || !createdAt) {
      rejected++;
      continue;
    }
    const sourceRaw = typeof raw.source === "string" ? raw.source : "in-store";
    const source = VALID_SOURCES.has(sourceRaw)
      ? (sourceRaw as ParsedReview["source"])
      : "in-store";
    reviews.push({
      id,
      rating: ratingNum as ParsedReview["rating"],
      comment:
        typeof raw.comment === "string" ? raw.comment.slice(0, 200) : "",
      customerName:
        typeof raw.customerName === "string"
          ? raw.customerName.slice(0, 80)
          : "",
      source,
      createdAt,
    });
  }
  return { reviews, rejected };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "POST a JSON array of reviews to validate + summarize. No persistence — parsing utility only.",
    expectedShape: {
      id: "string (uuid)",
      rating: "1|2|3|4|5",
      comment: "string ≤200 chars",
      customerName: "string",
      source: "in-store|google|fb",
      createdAt: "ISO string",
    },
  });
}

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
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

  const { reviews, rejected } = parseReviews(body);
  const total = reviews.length;
  const sumRating = reviews.reduce((s, r) => s + r.rating, 0);
  const avg = total > 0 ? Math.round((sumRating / total) * 100) / 100 : null;

  const distribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const r of reviews) {
    distribution[String(r.rating)]++;
  }

  const lowRatings = reviews.filter((r) => r.rating < 3);
  const alertLevel: "ok" | "watch" | "concern" =
    avg === null
      ? "ok"
      : avg < 3.5
      ? "concern"
      : avg < 4
      ? "watch"
      : "ok";

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    summary: {
      total,
      rejectedCount: rejected,
      avgRating: avg,
      distribution,
      lowRatingCount: lowRatings.length,
      alertLevel,
    },
    lowRatings,
    reviews,
  });
}
