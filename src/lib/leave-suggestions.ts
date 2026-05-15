import {
  VN_HOLIDAYS_2025_2027,
  type Holiday,
} from "./holidays";

export type LeaveSuggestion = {
  id: string;
  /** Friendly title, e.g. "Tết Nguyên đán (5 ngày)" */
  title: string;
  /** Optional sub-text like "16/02 — 22/02 · còn 3 tuần" */
  subtitle: string;
  /** ISO YYYY-MM-DD start of the suggested range */
  startDate: string;
  /** ISO YYYY-MM-DD end of the suggested range (inclusive) */
  endDate: string;
  /** Pre-filled reason */
  reason: string;
};

const DAY_MS = 86_400_000;

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function vnDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function daysAway(targetIso: string, todayIso: string): number {
  const a = isoToLocalDate(targetIso).getTime();
  const b = isoToLocalDate(todayIso).getTime();
  return Math.round((a - b) / DAY_MS);
}

function relativeLabel(daysAheadCount: number): string {
  if (daysAheadCount <= 0) return "hôm nay";
  if (daysAheadCount === 1) return "ngày mai";
  if (daysAheadCount < 14) return `còn ${daysAheadCount} ngày`;
  return `còn ${Math.round(daysAheadCount / 7)} tuần`;
}

/**
 * Suggest leave date ranges for upcoming Vietnamese holidays.
 * - Multi-day holidays (Tết spans 7 days) are returned as a single range
 *   covering the full sequence.
 * - Single-day holidays are returned standalone (no auto-extension to weekend
 *   to keep the suggestion conservative).
 *
 * @param daysAhead — only include holidays starting within this many days from today (default 60).
 * @param max — cap returned suggestions (default 5).
 */
export function getUpcomingLeaveSuggestions(
  daysAhead = 60,
  max = 5,
): LeaveSuggestion[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = localIso(today);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + daysAhead);
  const horizonIso = localIso(horizon);

  // Group consecutive holidays sharing a common base name (e.g. "Tết Nguyên đán")
  const candidates = VN_HOLIDAYS_2025_2027.filter(
    (h) => h.iso >= todayIso && h.iso <= horizonIso,
  ).sort((a, b) => a.iso.localeCompare(b.iso));

  const groups: Array<{ base: string; days: Holiday[] }> = [];
  for (const h of candidates) {
    const base = h.name.replace(/\s*\(.+?\)\s*$/, "").trim(); // strip "(Mồng N)" etc.
    const last = groups[groups.length - 1];
    if (last) {
      const lastIso = last.days[last.days.length - 1].iso;
      const gap = daysAway(h.iso, lastIso);
      if (last.base === base && gap <= 1) {
        last.days.push(h);
        continue;
      }
    }
    groups.push({ base, days: [h] });
  }

  const suggestions: LeaveSuggestion[] = [];
  for (const g of groups) {
    const startIso = g.days[0].iso;
    const endIso = g.days[g.days.length - 1].iso;
    const dayCount = g.days.length;
    const days = daysAway(startIso, todayIso);
    suggestions.push({
      id: `holiday:${startIso}`,
      title: dayCount > 1 ? `${g.base} (${dayCount} ngày)` : g.base,
      subtitle: `${vnDate(startIso)}${dayCount > 1 ? ` – ${vnDate(endIso)}` : ""} · ${relativeLabel(days)}`,
      startDate: startIso,
      endDate: endIso,
      reason: `Nghỉ ${g.base.toLowerCase()}`,
    });
    if (suggestions.length >= max) break;
  }
  return suggestions;
}
