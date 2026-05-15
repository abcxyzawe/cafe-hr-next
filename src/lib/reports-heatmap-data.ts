import { prisma } from "@/lib/prisma";

export type HeatmapDay = {
  iso: string;
  checkIns: number;
  hours: number;
};

/**
 * Aggregate attendance check-ins + worked hours per ISO date over the last
 * `days` days (inclusive of today). Missing days are filled with zeros so the
 * heatmap grid is always dense.
 */
export async function getReportsHeatmap(days = 90): Promise<HeatmapDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));

  const rows = await prisma.attendance.findMany({
    where: { checkIn: { gte: startDate } },
    select: { checkIn: true, hoursWorked: true },
  });

  const buckets = new Map<string, { checkIns: number; hours: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    buckets.set(toIso(d), { checkIns: 0, hours: 0 });
  }

  for (const r of rows) {
    const iso = toIso(new Date(r.checkIn));
    const slot = buckets.get(iso);
    if (!slot) continue;
    slot.checkIns += 1;
    slot.hours += Number(r.hoursWorked ?? 0);
  }

  return Array.from(buckets.entries()).map(([iso, v]) => ({
    iso,
    checkIns: v.checkIns,
    hours: Number(v.hours.toFixed(2)),
  }));
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
