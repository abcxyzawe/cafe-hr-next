import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { VN_HOLIDAYS_2025_2027 } from "@/lib/holidays";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SlotKey = "morning" | "afternoon" | "evening";
type Severity = "ok" | "low" | "high";

type EmployeeRef = { id: number; name: string; role: string };

type SlotInfo = {
  assigned: number;
  onLeave: number;
  effective: number;
  shortage: number;
  severity: Severity;
  employees: EmployeeRef[];
};

type DayInfo = {
  iso: string;
  weekday: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  slots: { morning: SlotInfo; afternoon: SlotInfo; evening: SlotInfo };
  unspecifiedAssigned: number;
  dayShortageTotal: number;
  severityWorst: Severity;
};

type Summary = {
  totalShortage: number;
  daysWithGap: number;
  worstDay: { iso: string; shortage: number } | null;
  byShiftType: { morning: number; afternoon: number; evening: number };
  recommendation: string;
};

// Monday-based labels: 0=Mon..6=Sun
const MON_FIRST_LABELS_VI = ["Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "CN"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  const i = Math.floor(n);
  return Math.max(lo, Math.min(hi, i));
}

function parseIntParam(
  raw: string | null,
  def: number,
  lo: number,
  hi: number,
): number {
  if (raw === null || raw === "") return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return clampInt(n, lo, hi);
}

function mondayOffset(jsDay: number): number {
  // jsDay: 0=Sun..6=Sat -> Mon-based: Mon=0..Sun=6
  return (jsDay + 6) % 7;
}

function severityOf(shortage: number): Severity {
  if (shortage <= 0) return "ok";
  if (shortage === 1) return "low";
  return "high";
}

function worstOf(a: Severity, b: Severity): Severity {
  const rank: Record<Severity, number> = { ok: 0, low: 1, high: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function buildRecommendation(
  totalShortage: number,
  daysWithGap: number,
  worstDay: { iso: string; shortage: number } | null,
): string {
  if (totalShortage === 0) {
    return "Lịch ca đầy đủ — không phát hiện thiếu hụt nhân sự trong khoảng thời gian này.";
  }
  if (worstDay && worstDay.shortage >= 2) {
    return `Cảnh báo: ${daysWithGap} ngày thiếu nhân sự (tổng ${totalShortage} suất). Ngày nghiêm trọng nhất ${worstDay.iso} thiếu ${worstDay.shortage} suất — cần bổ sung ca ngay.`;
  }
  return `Có ${daysWithGap} ngày thiếu nhẹ (tổng ${totalShortage} suất). Đề nghị xem xét điều chỉnh ca hoặc tăng ca cho nhân viên.`;
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const now = new Date();
  const url = new URL(req.url);
  const windowDays = parseIntParam(url.searchParams.get("days"), 14, 7, 60);
  const minPerSlot = parseIntParam(
    url.searchParams.get("minPerSlot"),
    2,
    1,
    10,
  );

  const startDay = startOfDayLocal(now);
  const endExclusive = addDays(startDay, windowDays);

  try {
    const [shiftRows, leaveRows] = await Promise.all([
      prisma.shift.findMany({
        where: {
          shiftDate: { gte: startDay, lt: endExclusive },
        },
        orderBy: [{ shiftDate: "asc" }, { id: "asc" }],
        include: {
          employee: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "approved",
          startDate: { lt: endExclusive },
          endDate: { gte: startDay },
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          employee: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    // Holiday lookup by ISO inside window
    const startIso = toIsoLocal(startDay);
    const endLastIso = toIsoLocal(addDays(startDay, windowDays - 1));
    const holidayByIso = new Map<string, string>();
    for (const h of VN_HOLIDAYS_2025_2027) {
      if (h.iso >= startIso && h.iso <= endLastIso) {
        holidayByIso.set(h.iso, h.name);
      }
    }

    // Pre-build per-day buckets
    const days: DayInfo[] = [];
    const dayByIso = new Map<string, DayInfo>();
    for (let i = 0; i < windowDays; i++) {
      const d = addDays(startDay, i);
      const iso = toIsoLocal(d);
      const wkIdx = mondayOffset(d.getDay());
      const isWeekend = wkIdx === 5 || wkIdx === 6;
      const holidayName = holidayByIso.get(iso);
      const makeSlot = (): SlotInfo => ({
        assigned: 0,
        onLeave: 0,
        effective: 0,
        shortage: 0,
        severity: "ok",
        employees: [],
      });
      const bucket: DayInfo = {
        iso,
        weekday: MON_FIRST_LABELS_VI[wkIdx],
        isWeekend,
        isHoliday: holidayName !== undefined,
        ...(holidayName !== undefined ? { holidayName } : {}),
        slots: {
          morning: makeSlot(),
          afternoon: makeSlot(),
          evening: makeSlot(),
        },
        unspecifiedAssigned: 0,
        dayShortageTotal: 0,
        severityWorst: "ok",
      };
      days.push(bucket);
      dayByIso.set(iso, bucket);
    }

    // Tally shifts per day/slot
    const byShiftType: { morning: number; afternoon: number; evening: number } =
      { morning: 0, afternoon: 0, evening: 0 };

    for (const r of shiftRows) {
      const iso = toIsoLocal(r.shiftDate);
      const bucket = dayByIso.get(iso);
      if (!bucket) continue;
      if (r.shiftType === null) {
        bucket.unspecifiedAssigned += 1;
        continue;
      }
      const slotKey: SlotKey = r.shiftType;
      const slot = bucket.slots[slotKey];
      slot.assigned += 1;
      slot.employees.push({
        id: r.employee.id,
        name: r.employee.name,
        role: r.employee.role,
      });
      byShiftType[slotKey] += 1;
    }

    // Tally leave per day (any approved leave overlapping that day counts once per slot)
    for (const lv of leaveRows) {
      const lvStart = startOfDayLocal(lv.startDate).getTime();
      const lvEnd = startOfDayLocal(lv.endDate).getTime();
      for (let ts = lvStart; ts <= lvEnd; ts += 86_400_000) {
        const cellIso = toIsoLocal(new Date(ts));
        const bucket = dayByIso.get(cellIso);
        if (!bucket) continue;
        bucket.slots.morning.onLeave += 1;
        bucket.slots.afternoon.onLeave += 1;
        bucket.slots.evening.onLeave += 1;
      }
    }

    // Compute effective/shortage/severity per slot & aggregate per day
    let totalShortage = 0;
    let daysWithGap = 0;
    let worstDay: { iso: string; shortage: number } | null = null;

    const slotKeys: SlotKey[] = ["morning", "afternoon", "evening"];
    for (const day of days) {
      let daySev: Severity = "ok";
      let dayTotal = 0;
      for (const k of slotKeys) {
        const slot = day.slots[k];
        const eff = Math.max(0, slot.assigned - slot.onLeave);
        const shortage = Math.max(0, minPerSlot - eff);
        slot.effective = eff;
        slot.shortage = shortage;
        slot.severity = severityOf(shortage);
        dayTotal += shortage;
        daySev = worstOf(daySev, slot.severity);
      }
      day.dayShortageTotal = dayTotal;
      day.severityWorst = daySev;
      totalShortage += dayTotal;
      if (dayTotal > 0) {
        daysWithGap += 1;
        if (worstDay === null || dayTotal > worstDay.shortage) {
          worstDay = { iso: day.iso, shortage: dayTotal };
        }
      }
    }

    const summary: Summary = {
      totalShortage,
      daysWithGap,
      worstDay,
      byShiftType,
      recommendation: buildRecommendation(totalShortage, daysWithGap, worstDay),
    };

    return NextResponse.json(
      {
        ok: true,
        generatedAt: now.toISOString(),
        windowDays,
        minPerSlot,
        summary,
        days,
      },
      {
        headers: {
          "cache-control": "private, max-age=120",
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
