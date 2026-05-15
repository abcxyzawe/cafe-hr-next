import { prisma } from "@/lib/prisma";

/**
 * Compute a 7-element daily-hours sparkline (oldest → newest) for each
 * given employee using a single wide query.
 *
 * Returns a Map keyed by employeeId. Employees with no attendance in the
 * window are still present with a [0,0,0,0,0,0,0] array.
 */
export async function getEmployeeSparklines(
  employeeIds: number[],
): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>();
  if (employeeIds.length === 0) return result;

  // Build the 7-day window (today and the 6 days before, local time, midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - 6);

  // Pre-build day keys (oldest first), and a key→index lookup
  const dayKeys: string[] = [];
  const keyToIndex = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const key = isoDayKey(d);
    dayKeys.push(key);
    keyToIndex.set(key, i);
  }

  // Initialise zero arrays for every requested employee
  for (const id of employeeIds) {
    result.set(id, [0, 0, 0, 0, 0, 0, 0]);
  }

  // ONE wide query
  const rows = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      checkIn: { gte: windowStart },
    },
    select: {
      employeeId: true,
      checkIn: true,
      hoursWorked: true,
    },
  });

  for (const r of rows) {
    const key = isoDayKey(r.checkIn);
    const idx = keyToIndex.get(key);
    if (idx === undefined) continue;
    const arr = result.get(r.employeeId);
    if (!arr) continue;
    const hours = r.hoursWorked === null ? 0 : Number(r.hoursWorked);
    if (Number.isFinite(hours)) {
      arr[idx] = (arr[idx] ?? 0) + hours;
    }
  }

  return result;
}

function isoDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
