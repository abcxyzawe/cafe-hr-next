import { VN_HOLIDAYS_2025_2027, type Holiday } from "./holidays";

export type UpcomingHoliday = Holiday & {
  daysUntil: number;
};

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Public + observed holidays falling within [today, today + daysAhead].
 * Sorted ascending by daysUntil. Default window: 3 days.
 */
export function getUpcomingHolidays(
  daysAhead = 3,
  today: Date = new Date(),
): UpcomingHoliday[] {
  const todayIso = toIsoLocal(today);
  const result: UpcomingHoliday[] = [];
  for (const h of VN_HOLIDAYS_2025_2027) {
    if (h.iso < todayIso) continue;
    const days = diffDays(todayIso, h.iso);
    if (days > daysAhead) continue;
    result.push({ ...h, daysUntil: days });
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}
