"use client";

import { useEffect, useState } from "react";
import {
  HOURS_EVENT,
  STORAGE_KEY,
  WEEKDAYS,
  WEEKDAY_LABEL,
  getWeekHours,
  type WeekDay,
  type WeekHours,
} from "@/lib/hours-state";

type Props = {
  className?: string;
  hideWhenLoading?: boolean;
};

type OpenState = {
  isOpen: boolean;
  /** When open: today's close time. When closed: next open time. */
  time: string;
  /** Only used when closed: label of the day the cafe next opens. */
  dayLabel: string | null;
};

function getCurrentWeekDay(date: Date): WeekDay {
  // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
  const jsDay = date.getDay();
  // Map to our WEEKDAYS order: mon(0)..sun(6)
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return WEEKDAYS[idx]!;
}

function formatHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function findNextOpen(
  hours: WeekHours,
  todayIdx: number,
): { time: string; dayLabel: string } | null {
  // Look ahead up to 7 days starting tomorrow
  for (let offset = 1; offset <= 7; offset++) {
    const idx = (todayIdx + offset) % 7;
    const day = WEEKDAYS[idx]!;
    const entry = hours[day];
    if (!entry.closed) {
      return { time: entry.open, dayLabel: WEEKDAY_LABEL[day] };
    }
  }
  return null;
}

function computeState(now: Date, hours: WeekHours): OpenState {
  const todayKey = getCurrentWeekDay(now);
  const todayIdx = WEEKDAYS.indexOf(todayKey);
  const today = hours[todayKey];
  const nowHHMM = formatHHMM(now);

  if (!today.closed && nowHHMM >= today.open && nowHHMM < today.close) {
    return { isOpen: true, time: today.close, dayLabel: null };
  }

  // Closed currently — figure out next opening
  if (!today.closed && nowHHMM < today.open) {
    return {
      isOpen: false,
      time: today.open,
      dayLabel: WEEKDAY_LABEL[todayKey],
    };
  }

  // After today's close OR today.closed === true → look ahead
  const next = findNextOpen(hours, todayIdx);
  if (next) {
    return { isOpen: false, time: next.time, dayLabel: next.dayLabel };
  }
  // All days closed (degenerate) — fall back to today's open
  return {
    isOpen: false,
    time: today.open,
    dayLabel: WEEKDAY_LABEL[todayKey],
  };
}

export function OpenNowBadge({
  className,
  hideWhenLoading = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<OpenState | null>(null);

  useEffect(() => {
    setMounted(true);

    const recompute = () => {
      const hours = getWeekHours();
      setState(computeState(new Date(), hours));
    };

    recompute();
    const interval = window.setInterval(recompute, 60_000);

    const onHoursChanged = () => recompute();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) recompute();
    };

    window.addEventListener(HOURS_EVENT, onHoursChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(HOURS_EVENT, onHoursChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!mounted || !state) {
    if (hideWhenLoading) return null;
    return (
      <span
        aria-hidden="true"
        className={
          "inline-flex h-6 w-28 animate-pulse items-center rounded-full bg-muted/60 " +
          (className ?? "")
        }
      />
    );
  }

  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset tabular-nums";
  const tone = state.isOpen
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
    : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  const emoji = state.isOpen ? "☕" : "🌙";
  const label = state.isOpen
    ? `Đang mở · Đóng lúc ${state.time}`
    : `Đóng cửa · Mở lúc ${state.time}${
        state.dayLabel ? ` (${state.dayLabel})` : ""
      }`;

  return (
    <span className={`${base} ${tone} ${className ?? ""}`.trim()}>
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

export default OpenNowBadge;
