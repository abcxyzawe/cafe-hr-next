import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Note: The Shift model (see prisma/schema.prisma) does not have a `status`
// field, and `shiftType` is the nullable enum {morning, afternoon, evening}.
// We bucket nullable shiftType under `unspecified` for the type breakdown.
type ShiftTypeKey = "morning" | "afternoon" | "evening" | "unspecified";

const WEEKDAY_LABELS_VI = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"];
// Monday-first label order used in each day bucket.
const MON_FIRST_LABELS_VI = ["Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "CN"];

type ShiftItem = {
  id: number;
  employee: { id: number; name: string; role: string };
  shiftType: ShiftTypeKey;
  startTime: string | null;
  endTime: string | null;
};

type DayBucket = {
  dateIso: string;
  weekday: string;
  total: number;
  shifts: ShiftItem[];
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

// Monday-of-week in local time. JS getDay(): 0=Sun..6=Sat.
function mondayOfWeek(d: Date): Date {
  const local = startOfDayLocal(d);
  const dow = local.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // shift to Monday
  local.setDate(local.getDate() + diff);
  return local;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function typeKey(t: "morning" | "afternoon" | "evening" | null): ShiftTypeKey {
  return t ?? "unspecified";
}

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const now = new Date();
  const weekStart = mondayOfWeek(now); // Monday 00:00 local
  const weekEndInclusive = addDays(weekStart, 6); // Sunday 00:00 local
  const weekEndExclusive = addDays(weekStart, 7); // next Monday 00:00 local

  // Pre-build 7 day buckets keyed by ISO date.
  const days: DayBucket[] = [];
  const dayIndex = new Map<string, DayBucket>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const iso = toIsoDate(d);
    const bucket: DayBucket = {
      dateIso: iso,
      weekday: MON_FIRST_LABELS_VI[i],
      total: 0,
      shifts: [],
    };
    days.push(bucket);
    dayIndex.set(iso, bucket);
  }

  try {
    const rows = await prisma.shift.findMany({
      where: {
        shiftDate: {
          gte: weekStart,
          lt: weekEndExclusive,
        },
      },
      orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }, { id: "asc" }],
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
    });

    const byType: Record<ShiftTypeKey, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      unspecified: 0,
    };
    let totalShifts = 0;

    for (const r of rows) {
      const iso = toIsoDate(r.shiftDate);
      const bucket = dayIndex.get(iso);
      if (!bucket) continue; // out-of-range safety
      const tk = typeKey(r.shiftType);
      const item: ShiftItem = {
        id: r.id,
        employee: {
          id: r.employee.id,
          name: r.employee.name,
          role: r.employee.role,
        },
        shiftType: tk,
        startTime: r.startTime,
        endTime: r.endTime,
      };
      bucket.shifts.push(item);
      bucket.total += 1;
      byType[tk] += 1;
      totalShifts += 1;
    }

    // Use the Sunday-based label list for the weekStart/weekEnd metadata.
    // (Not strictly needed by callers, but useful for cross-check.)
    void WEEKDAY_LABELS_VI;

    return NextResponse.json(
      {
        ok: true,
        generatedAt: now.toISOString(),
        weekStart: toIsoDate(weekStart),
        weekEnd: toIsoDate(weekEndInclusive),
        days,
        totals: {
          shifts: totalShifts,
          byType,
        },
      },
      {
        headers: {
          "cache-control": "private, max-age=120, s-maxage=120",
        },
      },
    );
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
