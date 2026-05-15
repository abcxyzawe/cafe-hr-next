// Pure stat computation for expense entries. No browser/Node dependencies.
import type { ExpenseCategory, ExpenseDay } from "./expenses-tracker";
import { CATEGORY_ORDER, dayTotal } from "./expenses-tracker";

export type ExpenseStats = {
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekDeltaPct: number | null; // null if last week was 0
  thisMonthTotal: number;
  byCategoryThisMonth: Record<ExpenseCategory, number>;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

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

function emptyByCategory(): Record<ExpenseCategory, number> {
  return {
    ingredients: 0,
    utilities: 0,
    wages: 0,
    marketing: 0,
    other: 0,
  };
}

export function computeExpenseStats(
  days: ExpenseDay[],
  today?: Date,
): ExpenseStats {
  const now = today ? new Date(today) : new Date();
  now.setHours(0, 0, 0, 0);

  const map = new Map<string, ExpenseDay>();
  for (const d of days) {
    if (d && typeof d.date === "string") {
      map.set(d.date, d);
    }
  }

  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = thisWeekStart; // exclusive

  let thisWeekTotal = 0;
  let lastWeekTotal = 0;
  let thisMonthTotal = 0;
  const byCategoryThisMonth = emptyByCategory();

  const month = now.getMonth();
  const year = now.getFullYear();

  for (const [iso, day] of map.entries()) {
    const total = dayTotal(day);
    if (total <= 0) continue;
    const [yStr, mStr, dStr] = iso.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const dd = Number(dStr);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(dd)) continue;
    const dt = new Date(y, m - 1, dd);
    dt.setHours(0, 0, 0, 0);

    if (dt >= thisWeekStart && dt <= now) thisWeekTotal += total;
    if (dt >= lastWeekStart && dt < lastWeekEnd) lastWeekTotal += total;
    if (dt.getMonth() === month && dt.getFullYear() === year && dt <= now) {
      thisMonthTotal += total;
      for (const cat of CATEGORY_ORDER) {
        byCategoryThisMonth[cat] += day[cat];
      }
    }
  }

  const weekDeltaPct =
    lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : null;

  // Touch isoOf so it remains used in case future code reaches for it; suppress lint by exporting via void.
  void isoOf;

  return {
    thisWeekTotal,
    lastWeekTotal,
    weekDeltaPct,
    thisMonthTotal,
    byCategoryThisMonth,
  };
}
