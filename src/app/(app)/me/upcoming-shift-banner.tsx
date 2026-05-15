"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { quickCheckin } from "./check-in-actions";

type Props = {
  /** ISO datetime string (local TZ) of the next shift start, or null when none */
  nextShiftStartIso: string | null;
  /** Whether the user already has an open attendance row */
  isClockedIn: boolean;
};

const UPCOMING_WINDOW_MIN = 60;
const STARTED_GRACE_MIN = 5;

function computeMinutesUntil(nextShiftStartIso: string | null): number | null {
  if (!nextShiftStartIso) return null;
  const startMs = new Date(nextShiftStartIso).getTime();
  if (Number.isNaN(startMs)) return null;
  return (startMs - Date.now()) / 60_000;
}

export function UpcomingShiftBanner({ nextShiftStartIso, isClockedIn }: Props) {
  const [minutesUntil, setMinutesUntil] = useState<number | null>(() =>
    computeMinutesUntil(nextShiftStartIso),
  );
  const [pending, startTransition] = useTransition();

  // Recompute every 30s while mounted
  useEffect(() => {
    setMinutesUntil(computeMinutesUntil(nextShiftStartIso));
    const id = setInterval(() => {
      setMinutesUntil(computeMinutesUntil(nextShiftStartIso));
    }, 30_000);
    return () => clearInterval(id);
  }, [nextShiftStartIso]);

  if (isClockedIn) return null;
  if (nextShiftStartIso === null || minutesUntil === null) return null;

  // Out of relevant window
  if (minutesUntil > UPCOMING_WINDOW_MIN) return null;
  if (minutesUntil < -STARTED_GRACE_MIN) return null;

  const hasStarted = minutesUntil <= 0;
  const minutesRounded = Math.max(0, Math.round(minutesUntil));

  function doCheckin() {
    startTransition(async () => {
      const res = await quickCheckin();
      if (res.ok) toast.success("Đã check-in. Chúc bạn ca làm vui vẻ!");
      else toast.error(res.error || "Không check-in được");
    });
  }

  const containerClass = hasStarted
    ? "border-rose-400/50 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-pink-500/10"
    : "border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-orange-500/10";

  const iconBgClass = hasStarted
    ? "bg-rose-500 text-white"
    : "bg-amber-500 text-white";

  const headerClass = hasStarted
    ? "text-rose-700 dark:text-rose-300"
    : "text-amber-700 dark:text-amber-300";

  const heading = hasStarted ? "Ca đã bắt đầu!" : "Sắp đến giờ vào ca";
  const message = hasStarted
    ? "Ca đã bắt đầu! Vào ca nhanh đi nhé."
    : `Ca tiếp theo bắt đầu trong ${minutesRounded} phút.`;

  const buttonClass = hasStarted
    ? "bg-rose-600 hover:bg-rose-700 text-white"
    : "bg-amber-600 hover:bg-amber-700 text-white";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm ${containerClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-md ${iconBgClass}`}
        >
          <Clock className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${headerClass}`}
          >
            {heading}
          </p>
          <p className="text-sm font-medium leading-snug" suppressHydrationWarning>
            {message}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bấm để check-in ngay — không cần PIN.
          </p>
        </div>
        <Button
          size="lg"
          onClick={doCheckin}
          disabled={pending}
          className={buttonClass}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
          Vào ca ngay
        </Button>
      </div>
    </div>
  );
}
