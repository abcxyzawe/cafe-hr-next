"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Target value to animate to. */
  to: number;
  /** Animation duration in ms. Default 800. */
  duration?: number;
  /** Starting value. Default 0. */
  from?: number;
  /** Number of decimals to display. Default 0. */
  decimals?: number;
  /** Optional formatter — overrides built-in toLocaleString. */
  format?: (value: number) => string;
  /** Locale for default toLocaleString. Default "vi-VN". */
  locale?: string;
  /** Optional thousand-grouping. Default true. */
  groupSeparator?: boolean;
  className?: string;
  /** Re-trigger animation when target changes (default true). */
  animateOnChange?: boolean;
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function LiveCounter({
  to,
  duration = 800,
  from = 0,
  decimals = 0,
  format,
  locale = "vi-VN",
  groupSeparator = true,
  className,
  animateOnChange = true,
}: Props) {
  const validTo = Number.isFinite(to) ? to : 0;

  const [value, setValue] = useState<number | null>(null);
  const startedFromRef = useRef<number>(from);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // SSR-safe: kick off animation only on client.
    let cancelled = false;
    const startTime = performance.now();
    const startValue = animateOnChange
      ? value === null
        ? from
        : value
      : from;
    startedFromRef.current = startValue;

    function tick(now: number) {
      if (cancelled) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const next =
        startedFromRef.current + (validTo - startedFromRef.current) * eased;
      setValue(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(validTo);
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTo, duration]);

  function display(v: number): string {
    if (format) return format(v);
    const fixed = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString();
    if (!groupSeparator) return fixed;
    const num = Number(fixed);
    if (!Number.isFinite(num)) return fixed;
    return num.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  if (value === null) {
    // SSR placeholder uses target value so search/screen-readers still see correct number.
    return (
      <span
        className={cn("inline-block tabular-nums", className)}
        suppressHydrationWarning
      >
        {display(validTo)}
      </span>
    );
  }

  return (
    <span className={cn("inline-block tabular-nums", className)}>
      {display(value)}
    </span>
  );
}
