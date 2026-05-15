"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresh the server component every `intervalMs` milliseconds via router.refresh().
 * Keeps the display TV always up-to-date without a full page reload (preserves cache).
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
