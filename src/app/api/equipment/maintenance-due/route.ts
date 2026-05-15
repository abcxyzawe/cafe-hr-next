import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EQUIPMENT_ITEMS, type EquipmentItem } from "@/lib/equipment-presets";
import {
  daysSince,
  type EquipmentRecord,
  type EquipmentState,
} from "@/lib/equipment-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Status = "overdue" | "due_soon" | "ok" | "never";

type MaintenanceItem = {
  id: string;
  name: string;
  category: EquipmentItem["category"];
  status: Status;
  daysSince: number | null;
  daysOverdue: number | null;
  intervalDays: number;
  suggestedActionVi: string;
};

type MaintenanceSummary = {
  total: number;
  overdue: number;
  dueSoon: number;
  ok: number;
  neverServiced: number;
};

type MaintenanceResponse = {
  ok: true;
  generatedAt: string;
  summary: MaintenanceSummary;
  items: MaintenanceItem[];
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_WARNING_DAYS = 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEquipmentRecord(value: unknown): EquipmentRecord | null {
  if (!isRecord(value)) return null;
  const lastServiced = value.lastServiced;
  const updatedAt = value.updatedAt;
  const notes = value.notes;
  if (
    typeof lastServiced !== "string" ||
    !ISO_DATE_RE.test(lastServiced) ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }
  return {
    lastServiced,
    notes: typeof notes === "string" ? notes : "",
    updatedAt,
  };
}

function parseItems(input: unknown): EquipmentState | null {
  if (!isRecord(input)) return null;
  const out: EquipmentState = {};
  for (const [key, raw] of Object.entries(input)) {
    if (typeof key !== "string" || key.length === 0) continue;
    const rec = parseEquipmentRecord(raw);
    if (rec) out[key] = rec;
  }
  return out;
}

function parseWarningDays(input: unknown): number {
  if (!isRecord(input)) return DEFAULT_WARNING_DAYS;
  const raw = input.warningDays;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 1) {
    return DEFAULT_WARNING_DAYS;
  }
  return Math.floor(raw);
}

function suggestedAction(
  status: Status,
  intervalDays: number,
  daysSinceVal: number | null,
  daysOverdueVal: number | null,
): string {
  switch (status) {
    case "overdue":
      return `Bảo dưỡng ngay, đã quá hạn ${daysOverdueVal ?? 0} ngày`;
    case "due_soon": {
      const remain =
        daysSinceVal === null
          ? intervalDays
          : Math.max(0, intervalDays - daysSinceVal);
      return `Lên lịch bảo dưỡng trong ${remain} ngày tới`;
    }
    case "ok":
      return `Tình trạng tốt, lần bảo dưỡng kế tiếp sau ${
        daysSinceVal === null
          ? intervalDays
          : Math.max(0, intervalDays - daysSinceVal)
      } ngày`;
    case "never":
    default:
      return "Chưa có lịch sử bảo dưỡng, cần kiểm tra và ghi nhận ngay";
  }
}

const STATUS_ORDER: Record<Status, number> = {
  overdue: 0,
  never: 1,
  due_soon: 2,
  ok: 3,
};

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
      { ok: false, error: "Body JSON không hợp lệ" },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "Body phải là object" },
      { status: 400 },
    );
  }

  const rawItems = body.items;
  let state: EquipmentState | null;
  if (Array.isArray(rawItems)) {
    // Accept array of { id, ...record } too, fold into state map.
    const folded: Record<string, unknown> = {};
    for (const entry of rawItems) {
      if (!isRecord(entry)) continue;
      const id = entry.id;
      if (typeof id !== "string" || id.length === 0) continue;
      folded[id] = entry;
    }
    state = parseItems(folded);
  } else {
    state = parseItems(rawItems);
  }

  if (state === null) {
    return NextResponse.json(
      { ok: false, error: "Trường 'items' không hợp lệ" },
      { status: 400 },
    );
  }

  try {
    const warningDays = parseWarningDays(body.thresholds);
    const now = new Date();
    const items: MaintenanceItem[] = EQUIPMENT_ITEMS.map((preset) => {
      const record = state[preset.id];
      if (!record) {
        return {
          id: preset.id,
          name: preset.name,
          category: preset.category,
          status: "never",
          daysSince: null,
          daysOverdue: null,
          intervalDays: preset.intervalDays,
          suggestedActionVi: suggestedAction(
            "never",
            preset.intervalDays,
            null,
            null,
          ),
        };
      }
      const since = daysSince(record.lastServiced, now);
      const sinceFinite = Number.isFinite(since) ? since : null;
      let status: Status;
      let daysOverdueVal: number | null = null;
      if (sinceFinite === null) {
        status = "never";
      } else if (sinceFinite >= preset.intervalDays) {
        status = "overdue";
        daysOverdueVal = sinceFinite - preset.intervalDays;
      } else if (preset.intervalDays - sinceFinite < warningDays) {
        status = "due_soon";
      } else {
        status = "ok";
      }
      return {
        id: preset.id,
        name: preset.name,
        category: preset.category,
        status,
        daysSince: sinceFinite,
        daysOverdue: daysOverdueVal,
        intervalDays: preset.intervalDays,
        suggestedActionVi: suggestedAction(
          status,
          preset.intervalDays,
          sinceFinite,
          daysOverdueVal,
        ),
      };
    });

    items.sort((a, b) => {
      const da = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (da !== 0) return da;
      // Within overdue: largest daysOverdue first.
      if (a.status === "overdue" && b.status === "overdue") {
        return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
      }
      // Within due_soon: smallest remaining days first (closest to overdue).
      if (a.status === "due_soon" && b.status === "due_soon") {
        const ra = a.intervalDays - (a.daysSince ?? 0);
        const rb = b.intervalDays - (b.daysSince ?? 0);
        return ra - rb;
      }
      return a.name.localeCompare(b.name, "vi");
    });

    const summary: MaintenanceSummary = {
      total: items.length,
      overdue: items.filter((i) => i.status === "overdue").length,
      dueSoon: items.filter((i) => i.status === "due_soon").length,
      ok: items.filter((i) => i.status === "ok").length,
      neverServiced: items.filter((i) => i.status === "never").length,
    };

    const payload: MaintenanceResponse = {
      ok: true,
      generatedAt: now.toISOString(),
      summary,
      items,
    };

    return NextResponse.json(payload, {
      headers: {
        "cache-control": "private, max-age=60",
      },
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
