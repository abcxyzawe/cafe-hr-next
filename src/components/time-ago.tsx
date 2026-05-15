"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** ISO timestamp or Date. */
  iso: string | Date;
  /** Update interval in ms. Default 30000 (30s). */
  intervalMs?: number;
  /** Add "vào" prefix for past times (e.g. "vào 5 phút trước"). Default false. */
  withPrefix?: boolean;
  /** Render bare placeholder until hydrated (avoids SSR mismatch). */
  className?: string;
  /** Optional title attribute override; defaults to absolute formatted timestamp. */
  title?: string;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function formatRelative(diffMs: number): string {
  const past = diffMs >= 0;
  const abs = Math.abs(diffMs);
  let value: string;
  if (abs < 45 * SECOND) {
    value = "vài giây";
  } else if (abs < HOUR) {
    const m = Math.max(1, Math.round(abs / MINUTE));
    value = `${m} phút`;
  } else if (abs < DAY) {
    const h = Math.max(1, Math.round(abs / HOUR));
    value = `${h} giờ`;
  } else if (abs < WEEK) {
    const d = Math.max(1, Math.round(abs / DAY));
    value = `${d} ngày`;
  } else if (abs < MONTH) {
    const w = Math.max(1, Math.round(abs / WEEK));
    value = `${w} tuần`;
  } else if (abs < YEAR) {
    const mo = Math.max(1, Math.round(abs / MONTH));
    value = `${mo} tháng`;
  } else {
    const y = Math.max(1, Math.round(abs / YEAR));
    value = `${y} năm`;
  }
  return past ? `${value} trước` : `trong ${value}`;
}

function formatAbsolute(d: Date): string {
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TimeAgo({
  iso,
  intervalMs = 30000,
  withPrefix = false,
  className,
  title,
}: Props) {
  const targetDate =
    typeof iso === "string" ? new Date(iso) : iso instanceof Date ? iso : null;
  const valid = targetDate !== null && Number.isFinite(targetDate.getTime());

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!valid) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [valid, intervalMs]);

  if (!valid) {
    return (
      <span className={cn("inline-block text-muted-foreground", className)}>
        —
      </span>
    );
  }

  const targetMs = targetDate.getTime();

  if (now === null) {
    // SSR placeholder until hydrated — show absolute timestamp so static fallback is meaningful.
    const absText = formatAbsolute(targetDate);
    return (
      <span
        className={cn("inline-block opacity-70", className)}
        title={title ?? absText}
        suppressHydrationWarning
      >
        {absText}
      </span>
    );
  }

  const diff = now - targetMs;
  const rel = formatRelative(diff);
  const display = withPrefix && diff >= 0 ? `vào ${rel}` : rel;
  return (
    <time
      dateTime={targetDate.toISOString()}
      title={title ?? formatAbsolute(targetDate)}
      className={cn("inline-block", className)}
    >
      {display}
    </time>
  );
}
