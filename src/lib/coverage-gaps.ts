import { isHoliday } from "./holidays";

export type CoverageGap = {
  dateIso: string;
  shiftType: "morning" | "afternoon" | "evening";
  assignedCount: number;
  severity: "empty" | "thin";
};

const SHIFT_TYPES: Array<"morning" | "afternoon" | "evening"> = [
  "morning",
  "afternoon",
  "evening",
];

function toIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Detect under-staffed (day × shift type) slots in the visible week.
 * - "empty"  → assignedCount === 0
 * - "thin"   → assignedCount > 0 && assignedCount <= thinThreshold
 * Skips past days (only flags today + future) and (by default) public holidays.
 */
export function detectCoverageGaps(
  shifts: Array<{ shiftDate: Date; shiftType: string | null }>,
  weekStart: Date,
  opts?: { thinThreshold?: number; skipHolidays?: boolean },
): CoverageGap[] {
  const thinThreshold = opts?.thinThreshold ?? 1;
  const skipHolidays = opts?.skipHolidays ?? true;

  // bucket counts per (dateIso, shiftType)
  const counts = new Map<string, number>();
  for (const s of shifts) {
    const iso = toIsoLocal(new Date(s.shiftDate));
    const type = s.shiftType ?? "morning";
    const key = `${iso}__${type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toIsoLocal(today);

  const gaps: CoverageGap[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const dateIso = toIsoLocal(d);

    // skip past days
    if (dateIso < todayIso) continue;
    // skip holidays
    if (skipHolidays && isHoliday(d)) continue;

    for (const shiftType of SHIFT_TYPES) {
      const assignedCount = counts.get(`${dateIso}__${shiftType}`) ?? 0;
      if (assignedCount === 0) {
        gaps.push({ dateIso, shiftType, assignedCount, severity: "empty" });
      } else if (assignedCount <= thinThreshold) {
        gaps.push({ dateIso, shiftType, assignedCount, severity: "thin" });
      }
    }
  }

  // empty first, then by date asc, then morning→afternoon→evening
  const typeOrder: Record<"morning" | "afternoon" | "evening", number> = {
    morning: 0,
    afternoon: 1,
    evening: 2,
  };
  gaps.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "empty" ? -1 : 1;
    if (a.dateIso !== b.dateIso) return a.dateIso < b.dateIso ? -1 : 1;
    return typeOrder[a.shiftType] - typeOrder[b.shiftType];
  });

  return gaps;
}
