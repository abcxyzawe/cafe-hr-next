"use client";

import { useEffect, useState } from "react";
import { Coffee, X } from "lucide-react";

type Props = {
  attendanceId: number;
  checkInIso: string;
};

const BREAK_THRESHOLD_HOURS = 4;
const URGENT_THRESHOLD_HOURS = 6;

function dismissKey(id: number): string {
  return `cafe-hr-break-dismissed-${id}`;
}

function formatDuration(elapsedMs: number): string {
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m} phút`;
  if (m <= 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

export function BreakSuggestionBanner({ attendanceId, checkInIso }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [now, setNow] = useState<number>(0);

  // Hydration: load dismissal flag from localStorage
  useEffect(() => {
    setNow(Date.now());
    const flag = localStorage.getItem(dismissKey(attendanceId));
    setDismissed(flag === "1");
    setHydrated(true);
  }, [attendanceId]);

  // Auto-tick every 60 seconds to recompute elapsed
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!hydrated || dismissed) return null;

  const checkInMs = new Date(checkInIso).getTime();
  const elapsedMs = now - checkInMs;
  const elapsedHours = elapsedMs / 3_600_000;

  if (elapsedHours < BREAK_THRESHOLD_HOURS) return null;

  const isUrgent = elapsedHours >= URGENT_THRESHOLD_HOURS;
  const durationLabel = formatDuration(elapsedMs);

  function dismiss() {
    localStorage.setItem(dismissKey(attendanceId), "1");
    setDismissed(true);
  }

  const containerClass = isUrgent
    ? "border-rose-400/50 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-pink-500/10"
    : "border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-orange-500/10";

  const iconBgClass = isUrgent
    ? "bg-rose-500 text-white"
    : "bg-amber-500 text-white";

  const headerClass = isUrgent
    ? "text-rose-700 dark:text-rose-300"
    : "text-amber-700 dark:text-amber-300";

  const message = isUrgent
    ? `Đã ${durationLabel} rồi — hãy nghỉ ngay nhé! \u2615`
    : `Bạn đã làm ${durationLabel} \u2014 cân nhắc nghỉ giải lao 15 phút \u2615`;

  const heading = isUrgent ? "Đã 6h+, hãy nghỉ ngay nhé!" : "Đến giờ giải lao rồi";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm ${containerClass}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng gợi ý nghỉ giải lao"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-md ${iconBgClass}`}
        >
          <Coffee className="size-6" />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${headerClass}`}
          >
            {heading}
          </p>
          <p className="text-sm font-medium leading-snug" suppressHydrationWarning>
            {message}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Nghỉ ngắn giúp bạn tỉnh táo và phục vụ khách tốt hơn.
          </p>
        </div>
      </div>
    </div>
  );
}
