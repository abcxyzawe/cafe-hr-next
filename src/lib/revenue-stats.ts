// Pure stat computation for revenue entries. No browser/Node dependencies.
import type { RevenueEntry } from "./revenue-tracker";

export type RevenueStats = {
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekDeltaPct: number | null; // null if last week was 0
  thisMonthTotal: number;
  dailyAverage30: number;
  daysWithData: number;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Treat Monday as the first day of the week (vi-VN convention).
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay(); // 0=Sun..6=Sat
  const offset = (day + 6) % 7; // Mon=0..Sun=6
  out.setDate(out.getDate() - offset);
  return out;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function computeRevenueStats(
  entries: RevenueEntry[],
  today?: Date,
): RevenueStats {
  const now = today ? new Date(today) : new Date();
  now.setHours(0, 0, 0, 0);

  const map = new Map<string, number>();
  for (const e of entries) {
    if (e && typeof e.date === "string" && Number.isFinite(e.amount)) {
      // If duplicates: prefer the larger non-zero value, else last.
      const prev = map.get(e.date);
      if (prev == null) map.set(e.date, e.amount);
      else map.set(e.date, e.amount || prev);
    }
  }

  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = thisWeekStart; // exclusive

  let thisWeekTotal = 0;
  let lastWeekTotal = 0;
  let thisMonthTotal = 0;
  let sum30 = 0;
  let daysWithData = 0;

  const month = now.getMonth();
  const year = now.getFullYear();

  // Iterate the last 30 days for daily average + days-with-data.
  const last30Start = addDays(now, -29);
  for (let i = 0; i < 30; i++) {
    const d = addDays(last30Start, i);
    const v = map.get(isoOf(d)) ?? 0;
    sum30 += v;
    if (v > 0) daysWithData++;
  }

  for (const [iso, amount] of map.entries()) {
    if (!amount) continue;
    const [yStr, mStr, dStr] = iso.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const day = Number(dStr);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) continue;
    const dt = new Date(y, m - 1, day);
    dt.setHours(0, 0, 0, 0);

    if (dt >= thisWeekStart && dt <= now) thisWeekTotal += amount;
    if (dt >= lastWeekStart && dt < lastWeekEnd) lastWeekTotal += amount;
    if (dt.getMonth() === month && dt.getFullYear() === year && dt <= now) {
      thisMonthTotal += amount;
    }
  }

  const weekDeltaPct =
    lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : null;

  const dailyAverage30 = daysWithData > 0 ? sum30 / daysWithData : 0;

  return {
    thisWeekTotal,
    lastWeekTotal,
    weekDeltaPct,
    thisMonthTotal,
    dailyAverage30,
    daysWithData,
  };
}
