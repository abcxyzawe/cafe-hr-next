import "server-only";
import { prisma } from "@/lib/prisma";

export type ShiftDistributionPoint = {
  weekKey: string; // "2026-W18"
  weekLabel: string; // "T18"
  morning: number;
  afternoon: number;
  evening: number;
  unset: number;
};

/**
 * Returns ISO-week-bucketed shift counts grouped by shiftType for the last
 * `weeksBack` weeks (Monday-anchored), ending in the current week. Buckets
 * with zero shifts are still emitted so the chart x-axis stays dense.
 */
export async function getShiftDistribution(
  weeksBack = 8,
): Promise<ShiftDistributionPoint[]> {
  const now = new Date();
  const currentMonday = mondayOf(now);

  // Earliest Monday in window (inclusive).
  const earliest = new Date(currentMonday);
  earliest.setDate(currentMonday.getDate() - (weeksBack - 1) * 7);
  earliest.setHours(0, 0, 0, 0);

  const rows = await prisma.shift.findMany({
    where: { shiftDate: { gte: earliest } },
    select: { shiftDate: true, shiftType: true },
  });

  // Pre-seed buckets for each week in the window so empty weeks render.
  const buckets = new Map<
    string,
    { weekKey: string; weekLabel: string; morning: number; afternoon: number; evening: number; unset: number }
  >();
  for (let i = 0; i < weeksBack; i++) {
    const monday = new Date(earliest);
    monday.setDate(earliest.getDate() + i * 7);
    const { year, week } = isoWeekParts(monday);
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
    buckets.set(weekKey, {
      weekKey,
      weekLabel: `T${week}`,
      morning: 0,
      afternoon: 0,
      evening: 0,
      unset: 0,
    });
  }

  for (const r of rows) {
    const monday = mondayOf(new Date(r.shiftDate));
    const { year, week } = isoWeekParts(monday);
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
    const slot = buckets.get(weekKey);
    if (!slot) continue;
    if (r.shiftType === "morning") slot.morning += 1;
    else if (r.shiftType === "afternoon") slot.afternoon += 1;
    else if (r.shiftType === "evening") slot.evening += 1;
    else slot.unset += 1;
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.weekKey.localeCompare(b.weekKey),
  );
}

/** Returns the Monday (00:00 local time) of the ISO week containing `d`. */
function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  // getDay(): 0=Sun..6=Sat. ISO week starts Monday, so map Sunday → 6.
  const dow = out.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  out.setDate(out.getDate() - offset);
  return out;
}

/**
 * Computes ISO week number and ISO-week-year for a given date using the
 * Thursday-of-the-week trick (per ISO 8601).
 */
function isoWeekParts(d: Date): { year: number; week: number } {
  // Use UTC-equivalent date pieces to avoid DST shifting calculations.
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year, week };
}
