"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** ISO timestamp or Date to count down to. */
  target: string | Date;
  /** When elapsed (target ≤ now), show this label instead. Defaults to "Đã đến". */
  pastLabel?: string;
  /** Show hours unit even when < 1 hour. Default false. */
  alwaysShowHours?: boolean;
  /** Hide seconds segment. Default false. */
  hideSeconds?: boolean;
  /** Update interval ms. Default 1000. */
  intervalMs?: number;
  className?: string;
  /** Layout style. Default "compact". */
  layout?: "compact" | "blocks";
};

type Parts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  past: boolean;
};

function diff(targetMs: number, nowMs: number): Parts {
  const totalMs = targetMs - nowMs;
  if (totalMs <= 0) {
    return {
      totalMs,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      past: true,
    };
  }
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalMs, days, hours, minutes, seconds, past: false };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function Countdown({
  target,
  pastLabel = "Đã đến",
  alwaysShowHours = false,
  hideSeconds = false,
  intervalMs = 1000,
  className,
  layout = "compact",
}: Props) {
  const targetMs =
    typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const validTarget = Number.isFinite(targetMs);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!validTarget) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [validTarget, intervalMs]);

  if (!validTarget) {
    return (
      <span className={cn("inline-block text-muted-foreground", className)}>
        —
      </span>
    );
  }

  if (now === null) {
    // SSR placeholder until hydrated
    return (
      <span className={cn("inline-block tabular-nums opacity-50", className)}>
        --:--:--
      </span>
    );
  }

  const parts = diff(targetMs, now);

  if (parts.past) {
    return (
      <span
        className={cn(
          "inline-block font-medium text-muted-foreground",
          className,
        )}
      >
        {pastLabel}
      </span>
    );
  }

  const showHours = alwaysShowHours || parts.days > 0 || parts.hours > 0;

  if (layout === "blocks") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        {parts.days > 0 && (
          <span className="rounded-md bg-card px-2 py-1 font-mono text-sm tabular-nums shadow-sm">
            {parts.days}n
          </span>
        )}
        <span className="rounded-md bg-card px-2 py-1 font-mono text-sm tabular-nums shadow-sm">
          {pad(parts.hours)}g
        </span>
        <span className="rounded-md bg-card px-2 py-1 font-mono text-sm tabular-nums shadow-sm">
          {pad(parts.minutes)}p
        </span>
        {!hideSeconds && (
          <span className="rounded-md bg-card px-2 py-1 font-mono text-sm tabular-nums shadow-sm">
            {pad(parts.seconds)}s
          </span>
        )}
      </span>
    );
  }

  // compact
  const segments: string[] = [];
  if (parts.days > 0) segments.push(`${parts.days}n`);
  if (showHours) segments.push(`${pad(parts.hours)}g`);
  segments.push(`${pad(parts.minutes)}p`);
  if (!hideSeconds) segments.push(`${pad(parts.seconds)}s`);
  return (
    <span className={cn("inline-block font-mono tabular-nums", className)}>
      {segments.join(" ")}
    </span>
  );
}
