import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NUMERIC_FIELDS = [
  "compostKg",
  "recyclingKg",
  "reusableCupsOffered",
  "reusableCupsAccepted",
  "waterSavedLiters",
] as const;

type ParsedDay = {
  date: string;
  compostKg: number;
  recyclingKg: number;
  reusableCupsOffered: number;
  reusableCupsAccepted: number;
  waterSavedLiters: number;
};

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toFiniteNonNegative(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function parseDays(input: unknown): { days: ParsedDay[]; rejected: number } {
  if (!Array.isArray(input)) return { days: [], rejected: 0 };
  const days: ParsedDay[] = [];
  let rejected = 0;
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      rejected++;
      continue;
    }
    const obj = raw as Record<string, unknown>;
    const date = typeof obj.date === "string" ? obj.date : "";
    if (!isIsoDate(date)) {
      rejected++;
      continue;
    }
    const day: ParsedDay = {
      date,
      compostKg: toFiniteNonNegative(obj.compostKg),
      recyclingKg: toFiniteNonNegative(obj.recyclingKg),
      reusableCupsOffered: toFiniteNonNegative(obj.reusableCupsOffered),
      reusableCupsAccepted: toFiniteNonNegative(obj.reusableCupsAccepted),
      waterSavedLiters: toFiniteNonNegative(obj.waterSavedLiters),
    };
    days.push(day);
  }
  return { days, rejected };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "POST a JSON array of sustainability days to validate + echo. No persistence — parsing utility only.",
    expectedShape: {
      date: "YYYY-MM-DD",
      compostKg: "number ≥ 0",
      recyclingKg: "number ≥ 0",
      reusableCupsOffered: "integer ≥ 0",
      reusableCupsAccepted: "integer ≥ 0",
      waterSavedLiters: "number ≥ 0",
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

  const { days, rejected } = parseDays(body);
  const totals: Record<string, number> = {};
  for (const f of NUMERIC_FIELDS) {
    totals[f] = days.reduce((sum, d) => sum + d[f], 0);
  }
  const acceptanceRate =
    totals.reusableCupsOffered > 0
      ? Math.round(
          (totals.reusableCupsAccepted / totals.reusableCupsOffered) * 1000,
        ) / 10
      : null;

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    summary: {
      validCount: days.length,
      rejectedCount: rejected,
      totals,
      acceptanceRatePct: acceptanceRate,
    },
    days,
  });
}
