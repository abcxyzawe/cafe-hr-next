"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  /** Total animation duration in ms. Default 900. */
  durationMs?: number;
  /** Number of decimal places to display. Default 0. */
  decimals?: number;
  /** Optional prefix (e.g., "$"). */
  prefix?: string;
  /** Optional suffix (e.g., "h"). */
  suffix?: string;
  className?: string;
  /** Use Vietnamese number formatting (e.g., 1.234). Default true. */
  locale?: string;
};

/**
 * Counts up from 0 to `value` once when mounted (or when value changes).
 * Respects `prefers-reduced-motion` — jumps to value instantly.
 */
export function AnimatedCounter({
  value,
  durationMs = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  locale = "vi-VN",
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    fromRef.current = 0;
    startRef.current = null;

    function frame(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  const formatted = display.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} aria-label={`${prefix}${value}${suffix}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
