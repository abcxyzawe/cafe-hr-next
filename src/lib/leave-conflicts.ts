export type LeaveConflict = {
  date: Date;
  role: string;
  conflictingRequestIds: number[];
};

export type LeaveLite = {
  id: number;
  employeeId: number;
  employeeRole: string;
  startDate: Date;
  endDate: Date;
  status: "pending" | "approved" | "rejected";
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDayKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayKeysFor(start: Date, end: Date): string[] {
  // Normalise both endpoints to local-midnight so DST shifts don't lose/gain a day.
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (e.getTime() < s.getTime()) return [];
  const out: string[] = [];
  const totalDays = Math.round((e.getTime() - s.getTime()) / MS_PER_DAY) + 1;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
    out.push(toDayKey(d));
  }
  return out;
}

function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map((p) => Number(p));
  return new Date(y, m - 1, d);
}

/**
 * Find leave conflicts: a "conflict day" is a calendar date where 2+ active
 * (pending or approved) requests overlap AND the requests share the same role.
 *
 * Returns a per-request map of conflict days that the request participates in.
 */
export function findLeaveConflicts(
  requests: LeaveLite[],
): Map<number, LeaveConflict[]> {
  const result = new Map<number, LeaveConflict[]>();

  // Filter to active requests.
  const active = requests.filter(
    (r) => r.status === "pending" || r.status === "approved",
  );
  if (active.length === 0) return result;

  // Bucket: dayKey -> role -> requestIds[]
  const buckets = new Map<string, Map<string, number[]>>();
  // Cache day keys per request so we can look up the conflicts we belong to.
  const requestDayKeys = new Map<number, string[]>();

  for (const req of active) {
    const keys = dayKeysFor(req.startDate, req.endDate);
    requestDayKeys.set(req.id, keys);
    for (const key of keys) {
      let roleMap = buckets.get(key);
      if (!roleMap) {
        roleMap = new Map();
        buckets.set(key, roleMap);
      }
      const list = roleMap.get(req.employeeRole);
      if (list) {
        list.push(req.id);
      } else {
        roleMap.set(req.employeeRole, [req.id]);
      }
    }
  }

  // For each request, build its conflict-day list.
  for (const req of active) {
    const keys = requestDayKeys.get(req.id) ?? [];
    const conflicts: LeaveConflict[] = [];
    for (const key of keys) {
      const roleMap = buckets.get(key);
      if (!roleMap) continue;
      const ids = roleMap.get(req.employeeRole);
      if (!ids || ids.length < 2) continue;
      conflicts.push({
        date: dayKeyToDate(key),
        role: req.employeeRole,
        conflictingRequestIds: ids.filter((id) => id !== req.id),
      });
    }
    if (conflicts.length > 0) {
      // Sort ascending by date for stable display.
      conflicts.sort((a, b) => a.date.getTime() - b.date.getTime());
      result.set(req.id, conflicts);
    }
  }

  return result;
}
