import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SlotKey = "morning" | "afternoon" | "evening";
type RoleKey = "barista" | "server" | "cashier" | "manager";
type Availability = "available" | "tentative" | "unavailable";

type Signals = {
  hasShiftScheduled: boolean;
  sameSlotConflict: boolean;
  isOnApprovedLeave: boolean;
  hours7Days: number;
  worked6OfLast7Days: boolean;
  sameSlotHistory30d: number;
};

type Candidate = {
  employee: {
    id: number;
    name: string;
    role: string;
    avatarUrl: string | null;
  };
  availability: Availability;
  availabilityReason: string;
  preferenceScore: number;
  signals: Signals;
};

const SLOT_KEYS: ReadonlySet<SlotKey> = new Set([
  "morning",
  "afternoon",
  "evening",
]);
const ROLE_KEYS: ReadonlySet<RoleKey> = new Set([
  "barista",
  "server",
  "cashier",
  "manager",
]);

const ROLE_SLOT_FIT: Record<RoleKey, Record<SlotKey, number>> = {
  barista: { morning: 20, afternoon: 10, evening: 5 },
  server: { morning: 10, afternoon: 15, evening: 15 },
  cashier: { morning: 15, afternoon: 15, evening: 10 },
  manager: { morning: 10, afternoon: 20, evening: 15 },
};

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

function parseIsoDate(raw: string | null): Date | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  const d = new Date(y, mo - 1, da, 0, 0, 0, 0);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo - 1 ||
    d.getDate() !== da
  ) {
    return null;
  }
  return d;
}

function isSlotKey(s: string | null): s is SlotKey {
  return s !== null && SLOT_KEYS.has(s as SlotKey);
}

function isRoleKey(s: string | null): s is RoleKey {
  return s !== null && ROLE_KEYS.has(s as RoleKey);
}

function buildReason(
  availability: Availability,
  s: Signals,
  date: string,
  shiftType: SlotKey,
): string {
  const slotVi: Record<SlotKey, string> = {
    morning: "ca sáng",
    afternoon: "ca chiều",
    evening: "ca tối",
  };
  const slotLabel = slotVi[shiftType];
  if (availability === "unavailable") {
    if (s.isOnApprovedLeave) {
      return `Đang nghỉ phép đã duyệt vào ngày ${date}.`;
    }
    if (s.sameSlotConflict) {
      return `Đã có lịch ${slotLabel} ngày ${date} — trùng ca.`;
    }
    return `Không khả dụng cho ${slotLabel} ngày ${date}.`;
  }
  if (availability === "tentative") {
    const reasons: string[] = [];
    if (s.hasShiftScheduled && !s.sameSlotConflict) {
      reasons.push(`đã có ca khác cùng ngày ${date}`);
    }
    if (s.hours7Days >= 56) {
      reasons.push(`đã làm ${s.hours7Days.toFixed(1)}h trong 7 ngày qua`);
    }
    if (s.worked6OfLast7Days) {
      reasons.push("đã đi làm ≥6/7 ngày gần nhất — nên nghỉ");
    }
    if (reasons.length === 0) {
      return `Có thể nhận ${slotLabel} nhưng cần cân nhắc.`;
    }
    return `Tạm khả dụng: ${reasons.join("; ")}.`;
  }
  const positives: string[] = [];
  if (s.hours7Days < 40) {
    positives.push(`mới làm ${s.hours7Days.toFixed(1)}h/7 ngày`);
  }
  if (s.sameSlotHistory30d > 0) {
    positives.push(
      `đã làm ${slotLabel} ${s.sameSlotHistory30d} lần trong 30 ngày`,
    );
  }
  if (positives.length === 0) {
    return `Sẵn sàng cho ${slotLabel} ngày ${date}.`;
  }
  return `Sẵn sàng cho ${slotLabel}: ${positives.join("; ")}.`;
}

export async function GET(req: Request) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sess.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const dateRaw = url.searchParams.get("date");
  const shiftTypeRaw = url.searchParams.get("shiftType");
  const roleRaw = url.searchParams.get("role");

  const targetDate = parseIsoDate(dateRaw);
  if (!targetDate) {
    return NextResponse.json(
      { ok: false, error: "Tham số 'date' không hợp lệ (yêu cầu YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (!isSlotKey(shiftTypeRaw)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Tham số 'shiftType' không hợp lệ (chỉ chấp nhận morning|afternoon|evening).",
      },
      { status: 400 },
    );
  }
  const shiftType: SlotKey = shiftTypeRaw;

  let roleFilter: RoleKey | null = null;
  if (roleRaw !== null && roleRaw !== "") {
    if (!isRoleKey(roleRaw)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Tham số 'role' không hợp lệ (chỉ chấp nhận barista|server|cashier|manager).",
        },
        { status: 400 },
      );
    }
    roleFilter = roleRaw;
  }

  const now = new Date();
  const targetIso = toIsoLocal(targetDate);
  const dayStart = startOfDayLocal(targetDate);
  const dayEndExclusive = addDays(dayStart, 1);

  const past7Start = addDays(dayStart, -7);
  const past7EndExclusive = dayStart;
  const past30Start = addDays(dayStart, -30);
  const yesterdayStart = addDays(dayStart, -1);

  try {
    const employees = await prisma.employee.findMany({
      where: roleFilter !== null ? { role: roleFilter } : undefined,
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { id: "asc" },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          generatedAt: now.toISOString(),
          date: targetIso,
          shiftType,
          roleFilter,
          summary: {
            totalCandidates: 0,
            available: 0,
            tentative: 0,
            unavailable: 0,
          },
          candidates: [],
        },
        { headers: { "cache-control": "private, max-age=60" } },
      );
    }

    const empIds = employees.map((e) => e.id);

    const [shiftsOnDay, leavesOverlap, attendance7, shifts30] =
      await Promise.all([
        prisma.shift.findMany({
          where: {
            employeeId: { in: empIds },
            shiftDate: { gte: dayStart, lt: dayEndExclusive },
          },
          select: { employeeId: true, shiftType: true },
        }),
        prisma.leaveRequest.findMany({
          where: {
            employeeId: { in: empIds },
            status: "approved",
            startDate: { lt: dayEndExclusive },
            endDate: { gte: dayStart },
          },
          select: { employeeId: true },
        }),
        prisma.attendance.findMany({
          where: {
            employeeId: { in: empIds },
            checkIn: { gte: past7Start, lt: past7EndExclusive },
          },
          select: {
            employeeId: true,
            checkIn: true,
            hoursWorked: true,
          },
        }),
        prisma.shift.findMany({
          where: {
            employeeId: { in: empIds },
            shiftType,
            shiftDate: { gte: past30Start, lt: dayStart },
          },
          select: { employeeId: true },
        }),
      ]);

    const hasAnyShiftDay = new Map<number, boolean>();
    const hasSameSlotConflict = new Map<number, boolean>();
    for (const s of shiftsOnDay) {
      hasAnyShiftDay.set(s.employeeId, true);
      if (s.shiftType === shiftType) {
        hasSameSlotConflict.set(s.employeeId, true);
      }
    }

    const onLeaveSet = new Set<number>();
    for (const lv of leavesOverlap) {
      onLeaveSet.add(lv.employeeId);
    }

    const hours7Map = new Map<number, number>();
    const workedDays7 = new Map<number, Set<string>>();
    const workedYesterday = new Set<number>();
    const yesterdayIso = toIsoLocal(yesterdayStart);
    for (const a of attendance7) {
      const h = a.hoursWorked === null ? 0 : Number(a.hoursWorked);
      hours7Map.set(a.employeeId, (hours7Map.get(a.employeeId) ?? 0) + h);
      const dayIso = toIsoLocal(startOfDayLocal(a.checkIn));
      let set = workedDays7.get(a.employeeId);
      if (!set) {
        set = new Set<string>();
        workedDays7.set(a.employeeId, set);
      }
      set.add(dayIso);
      if (dayIso === yesterdayIso) {
        workedYesterday.add(a.employeeId);
      }
    }

    const sameSlot30Map = new Map<number, number>();
    for (const s of shifts30) {
      sameSlot30Map.set(
        s.employeeId,
        (sameSlot30Map.get(s.employeeId) ?? 0) + 1,
      );
    }

    const candidates: Candidate[] = employees.map((emp) => {
      const hasShiftScheduled = hasAnyShiftDay.get(emp.id) ?? false;
      const sameSlotConflict = hasSameSlotConflict.get(emp.id) ?? false;
      const isOnApprovedLeave = onLeaveSet.has(emp.id);
      const hours7DaysRaw = hours7Map.get(emp.id) ?? 0;
      const hours7Days = Math.round(hours7DaysRaw * 100) / 100;
      const workedSet = workedDays7.get(emp.id);
      const worked6OfLast7Days = (workedSet?.size ?? 0) >= 6;
      const sameSlotHistory30d = sameSlot30Map.get(emp.id) ?? 0;

      const signals: Signals = {
        hasShiftScheduled,
        sameSlotConflict,
        isOnApprovedLeave,
        hours7Days,
        worked6OfLast7Days,
        sameSlotHistory30d,
      };

      let availability: Availability;
      if (isOnApprovedLeave || sameSlotConflict) {
        availability = "unavailable";
      } else if (hasShiftScheduled || hours7Days >= 56 || worked6OfLast7Days) {
        availability = "tentative";
      } else {
        availability = "available";
      }

      let preferenceScore = 0;
      if (availability === "available") preferenceScore += 30;
      if (hours7Days < 40) preferenceScore += 20;
      if (!workedYesterday.has(emp.id)) preferenceScore += 10;
      if (sameSlotHistory30d > 0) preferenceScore += 20;
      if (isRoleKey(emp.role)) {
        preferenceScore += ROLE_SLOT_FIT[emp.role][shiftType];
      }
      if (preferenceScore > 100) preferenceScore = 100;
      if (preferenceScore < 0) preferenceScore = 0;

      const availabilityReason = buildReason(
        availability,
        signals,
        targetIso,
        shiftType,
      );

      return {
        employee: {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          avatarUrl: emp.avatarUrl,
        },
        availability,
        availabilityReason,
        preferenceScore,
        signals,
      };
    });

    const availabilityRank: Record<Availability, number> = {
      available: 0,
      tentative: 1,
      unavailable: 2,
    };
    candidates.sort((a, b) => {
      const ra = availabilityRank[a.availability];
      const rb = availabilityRank[b.availability];
      if (ra !== rb) return ra - rb;
      if (a.preferenceScore !== b.preferenceScore) {
        return b.preferenceScore - a.preferenceScore;
      }
      return a.employee.id - b.employee.id;
    });

    const summary = {
      totalCandidates: candidates.length,
      available: 0,
      tentative: 0,
      unavailable: 0,
    };
    for (const c of candidates) {
      summary[c.availability] += 1;
    }

    return NextResponse.json(
      {
        ok: true,
        generatedAt: now.toISOString(),
        date: targetIso,
        shiftType,
        roleFilter,
        summary,
        candidates,
      },
      { headers: { "cache-control": "private, max-age=60" } },
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
