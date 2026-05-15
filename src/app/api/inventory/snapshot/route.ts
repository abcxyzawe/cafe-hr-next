import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { INVENTORY_ITEMS } from "@/lib/inventory-presets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RawSnapshot = Record<string, { qty: unknown; updatedAt?: unknown }>;

type ParsedEntry = { id: string; qty: number; updatedAt: string | null };

function parseSnapshot(input: unknown): {
  entries: ParsedEntry[];
  invalidIds: string[];
} {
  const entries: ParsedEntry[] = [];
  const invalidIds: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { entries, invalidIds };
  }
  const obj = input as RawSnapshot;
  for (const [id, raw] of Object.entries(obj)) {
    if (raw === null || typeof raw !== "object") {
      invalidIds.push(id);
      continue;
    }
    const qty = Number(raw.qty);
    if (!Number.isFinite(qty) || qty < 0) {
      invalidIds.push(id);
      continue;
    }
    const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : null;
    entries.push({ id, qty: Math.round(qty * 1000) / 1000, updatedAt });
  }
  return { entries, invalidIds };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "POST a JSON body to validate + echo your inventory snapshot. No persistence — this endpoint is a parsing utility.",
    expectedShape: {
      "<itemId>": { qty: "number ≥ 0", updatedAt: "ISO string (optional)" },
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

  const { entries, invalidIds } = parseSnapshot(body);
  const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);

  const presetById = new Map(INVENTORY_ITEMS.map((it) => [it.id, it]));
  const qtyById = new Map(entries.map((e) => [e.id, e.qty]));

  type Alert = {
    id: string;
    name: string;
    qty: number;
    threshold: number;
    unit: string;
    level: "out" | "low" | "warn";
  };
  const alerts: Alert[] = [];
  for (const preset of INVENTORY_ITEMS) {
    const qty = qtyById.get(preset.id) ?? preset.defaultQty;
    if (qty <= 0) {
      alerts.push({
        id: preset.id,
        name: preset.name,
        qty,
        threshold: preset.threshold,
        unit: preset.unit,
        level: "out",
      });
    } else if (qty <= preset.threshold / 2) {
      alerts.push({
        id: preset.id,
        name: preset.name,
        qty,
        threshold: preset.threshold,
        unit: preset.unit,
        level: "low",
      });
    } else if (qty < preset.threshold) {
      alerts.push({
        id: preset.id,
        name: preset.name,
        qty,
        threshold: preset.threshold,
        unit: preset.unit,
        level: "warn",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    receivedAt: new Date().toISOString(),
    summary: {
      validCount: entries.length,
      invalidCount: invalidIds.length,
      totalQty: Math.round(totalQty * 1000) / 1000,
      knownItems: INVENTORY_ITEMS.length,
      tracked: presetById.size > 0
        ? entries.filter((e) => presetById.has(e.id)).length
        : 0,
      alertCounts: {
        out: alerts.filter((a) => a.level === "out").length,
        low: alerts.filter((a) => a.level === "low").length,
        warn: alerts.filter((a) => a.level === "warn").length,
      },
    },
    alerts,
    invalidIds,
    entries,
  });
}
