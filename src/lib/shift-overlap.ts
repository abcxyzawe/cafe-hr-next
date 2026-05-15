export type ShiftLite = {
  id: number;
  employeeId: number;
  employeeName: string;
  shiftDate: Date;
  startTime: string | null;
  endTime: string | null;
};

export type ShiftOverlap = {
  date: Date;
  employeeId: number;
  employeeName: string;
  shiftIds: number[];
};

function toDayKey(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

type Range = { start: number; end: number; allDay: boolean };

function toRange(s: ShiftLite): Range {
  const start = toMinutes(s.startTime);
  const end = toMinutes(s.endTime);
  if (start === null || end === null) {
    return { start: 0, end: 24 * 60, allDay: true };
  }
  return { start, end, allDay: false };
}

function rangesOverlap(a: Range, b: Range): boolean {
  if (a.allDay || b.allDay) return true;
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

/**
 * Detect same-employee shift overlaps within the same day.
 * Two shifts overlap iff their time ranges intersect; null start/end = all-day.
 * Each entry collapses ALL overlapping shifts on that day for that employee.
 */
export function findShiftOverlaps(shifts: ShiftLite[]): ShiftOverlap[] {
  // group by dayKey + employeeId
  const groups = new Map<string, ShiftLite[]>();
  for (const s of shifts) {
    const key = `${toDayKey(s.shiftDate)}__${s.employeeId}`;
    const arr = groups.get(key);
    if (arr) arr.push(s);
    else groups.set(key, [s]);
  }

  const overlaps: ShiftOverlap[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;

    const ranges = list.map((s) => ({ shift: s, range: toRange(s) }));
    const overlappingIds = new Set<number>();

    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        if (rangesOverlap(ranges[i].range, ranges[j].range)) {
          overlappingIds.add(ranges[i].shift.id);
          overlappingIds.add(ranges[j].shift.id);
        }
      }
    }

    if (overlappingIds.size === 0) continue;

    const first = list[0];
    const ids = list
      .filter((s) => overlappingIds.has(s.id))
      .map((s) => s.id)
      .sort((a, b) => a - b);

    overlaps.push({
      date: new Date(
        first.shiftDate.getFullYear(),
        first.shiftDate.getMonth(),
        first.shiftDate.getDate(),
      ),
      employeeId: first.employeeId,
      employeeName: first.employeeName,
      shiftIds: ids,
    });
  }

  // sort by date asc, then employee name
  overlaps.sort((a, b) => {
    const ad = a.date.getTime();
    const bd = b.date.getTime();
    if (ad !== bd) return ad - bd;
    return a.employeeName.localeCompare(b.employeeName);
  });

  return overlaps;
}
