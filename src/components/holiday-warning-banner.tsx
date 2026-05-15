"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarHeart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/lib/holidays";

const DISMISS_KEY = "cafe-hr-holiday-warning-dismissed";

type UpcomingHoliday = Holiday & {
  daysUntil: number;
};

function dismissKeyFor(iso: string): string {
  return `${DISMISS_KEY}:${iso}`;
}

export function HolidayWarningBanner({
  upcoming,
}: {
  upcoming: UpcomingHoliday[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const dismissed = new Set<string>();
    for (const h of upcoming) {
      if (typeof window === "undefined") break;
      if (window.localStorage.getItem(dismissKeyFor(h.iso)) === "1") {
        dismissed.add(h.iso);
      }
    }
    setHidden(dismissed);
    setHydrated(true);
  }, [upcoming]);

  function dismiss(iso: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dismissKeyFor(iso), "1");
    }
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(iso);
      return next;
    });
  }

  if (!hydrated) return null;

  const visible = upcoming.filter((h) => !hidden.has(h.iso));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((h) => {
        const tone = h.daysUntil === 0
          ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100"
          : h.daysUntil <= 1
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100";
        const dayLabel = h.daysUntil === 0
          ? "Hôm nay"
          : h.daysUntil === 1
          ? "Ngày mai"
          : `${h.daysUntil} ngày nữa`;
        return (
          <div
            key={h.iso}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm",
              tone,
            )}
          >
            <CalendarHeart className="mt-0.5 size-5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">
                {dayLabel}: {h.name}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                Hãy kiểm tra lịch ca, đơn nghỉ phép và sắp xếp người trực ngày{" "}
                {h.iso}.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Link
                  href="/leave"
                  className="rounded-full border border-current/30 bg-background/40 px-2.5 py-0.5 hover:bg-background/70"
                >
                  Đơn nghỉ phép
                </Link>
                <Link
                  href="/shifts"
                  className="rounded-full border border-current/30 bg-background/40 px-2.5 py-0.5 hover:bg-background/70"
                >
                  Lịch ca
                </Link>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(h.iso)}
              aria-label="Đóng"
              className="absolute right-2 top-2 rounded-md p-1 opacity-60 transition-opacity hover:bg-background/40 hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
