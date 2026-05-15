import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EQUIPMENT_ITEMS } from "@/lib/equipment-presets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RawRecord = { lastServiced?: unknown; notes?: unknown; updatedAt?: unknown };

type ParsedRecord = {
  id: string;
  lastServiced: string;
  notes: string;
  updatedAt: string | null;
  daysSinceService: number | null;
  intervalDays: number;
  status: "ok" | "due-soon" | "overdue" | "never-serviced";
};

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function daysBetween(fromIso: string, today: Date): number {
  const from = new Date(`${fromIso}T00:00:00`);
  return Math.floor((today.getTime() - from.getTime()) / 86_400_000);
}

function statusFor(
  daysSince: number | null,
  intervalDays: number,
): ParsedRecord["status"] {
  if (daysSince === null) return "never-serviced";
  if (daysSince >= intervalDays) return "overdue";
  if (intervalDays - daysSince < 7) return "due-soon";
  return "ok";
}

function parseSnapshot(input: unknown, today: Date): {
  records: ParsedRecord[];
  invalidIds: string[];
} {
  const records: ParsedRecord[] = [];
  const invalidIds: string[] = [];
  const presetById = new Map(EQUIPMENT_ITEMS.map((it) => [it.id, it]));

  const sourceMap = new Map<string, RawRecord>();
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        sourceMap.set(id, raw as RawRecord);
      } else {
        invalidIds.push(id);
      }
    }
  }

  for (const preset of EQUIPMENT_ITEMS) {
    const raw = sourceMap.get(preset.id);
    const lastServiced =
      raw && typeof raw.lastServiced === "string" && isIsoDate(raw.lastServiced)
        ? raw.lastServiced
        : "";
    const notes =
      raw && typeof raw.notes === "string" ? raw.notes.slice(0, 500) : "";
    const updatedAt =
      raw && typeof raw.updatedAt === "string" ? raw.updatedAt : null;
    const daysSince = lastServiced ? daysBetween(lastServiced, today) : null;
    records.push({
      id: preset.id,
      lastServiced,
      notes,
      updatedAt,
      daysSinceService: daysSince,
      intervalDays: preset.intervalDays,
      status: statusFor(daysSince, preset.intervalDays),
    });
  }

  // Surface IDs in payload that don't match any preset (typos, removed items)
  for (const id of sourceMap.keys()) {
    if (!presetById.has(id)) invalidIds.push(id);
  }

  return { records, invalidIds };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "POST a JSON map of equipment records to validate + classify by service status. No persistence — parsing utility only.",
    expectedShape: {
      "<itemId>": {
        lastServiced: "YYYY-MM-DD or empty",
        notes: "string ≤500 chars",
        updatedAt: "ISO timestamp or null",
      },
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { records, invalidIds } = parseSnapshot(body, today);

  const counts = {
    ok: records.filter((r) => r.status === "ok").length,
    "due-soon": records.filter((r) => r.status === "due-soon").length,
    overdue: records.filter((r) => r.status === "overdue").length,
    "never-serviced": records.filter((r) => r.status === "never-serviced").length,
  };
  const overdueItems = records
    .filter((r) => r.status === "overdue" || r.status === "never-serviced")
    .map((r) => r.id);

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    summary: {
      knownItems: EQUIPMENT_ITEMS.length,
      counts,
      overdueItems,
      invalidIds,
    },
    records,
  });
}
