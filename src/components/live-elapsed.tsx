"use client";

import { useEffect, useState } from "react";

function formatElapsed(start: Date): string {
  const ms = Date.now() - start.getTime();
  if (ms < 0) return "0p";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}p`;
  return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
}

/**
 * Renders elapsed time since `start`, ticking every 30 seconds while mounted.
 */
export function LiveElapsed({ start }: { start: Date | string }) {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{formatElapsed(startDate)}</span>;
}
