import "server-only";
import { prisma } from "@/lib/prisma";

export type DayDensity = {
  iso: string;
  total: number;
  morning: number;
  afternoon: number;
  evening: number;
  unset: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export async function getShiftDensityForMonth(
  year: number,
  month: number,
): Promise<DayDensity[]> {
  const gte = new Date(year, month - 1, 1);
  const lt = new Date(year, month, 1);

  const shifts = await prisma.shift.findMany({
    where: { shiftDate: { gte, lt } },
    select: { shiftDate: true, shiftType: true },
  });

  const map = new Map<string, DayDensity>();
  for (const s of shifts) {
    const iso = toIsoLocal(s.shiftDate);
    const cur =
      map.get(iso) ??
      ({
        iso,
        total: 0,
        morning: 0,
        afternoon: 0,
        evening: 0,
        unset: 0,
      } satisfies DayDensity);
    cur.total += 1;
    if (s.shiftType === "morning") cur.morning += 1;
    else if (s.shiftType === "afternoon") cur.afternoon += 1;
    else if (s.shiftType === "evening") cur.evening += 1;
    else cur.unset += 1;
    map.set(iso, cur);
  }

  return Array.from(map.values()).sort((a, b) => a.iso.localeCompare(b.iso));
}
