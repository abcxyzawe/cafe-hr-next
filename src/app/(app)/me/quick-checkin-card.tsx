"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveElapsed } from "@/components/live-elapsed";
import { quickCheckin, quickCheckout } from "./check-in-actions";

type Props = {
  /** ISO string of an open attendance check-in, or null when not clocked in */
  openCheckInIso: string | null;
  /** Earliest scheduled shift start time today as "HH:MM" or null */
  nextShiftTime: string | null;
};

export function QuickCheckinCard({ openCheckInIso, nextShiftTime }: Props) {
  const [pending, startTransition] = useTransition();
  const isClockedIn = openCheckInIso !== null;

  function doCheckin() {
    startTransition(async () => {
      const res = await quickCheckin();
      if (res.ok) toast.success("Đã check-in. Chúc bạn ca làm vui vẻ!");
      else toast.error(res.error || "Không check-in được");
    });
  }

  function doCheckout() {
    startTransition(async () => {
      const res = await quickCheckout();
      if (res.ok) toast.success("Đã check-out. Cảm ơn vì ca làm hôm nay!");
      else toast.error(res.error || "Không check-out được");
    });
  }

  return (
    <Card
      className={
        isClockedIn
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
          : "border-primary/30 bg-gradient-to-br from-primary/10 to-accent/30"
      }
    >
      <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-md ${
            isClockedIn
              ? "bg-emerald-500 text-white"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {isClockedIn ? <LogOut className="size-6" /> : <LogIn className="size-6" />}
        </div>
        <div className="flex-1 min-w-0">
          {isClockedIn ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Đang trong ca
              </p>
              <p className="text-lg font-bold leading-tight">
                Đã làm <LiveElapsed start={openCheckInIso!} />
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bấm để kết thúc ca và ghi nhận giờ làm
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Sẵn sàng check-in
              </p>
              <p className="text-lg font-bold leading-tight">
                {nextShiftTime
                  ? `Ca tiếp theo lúc ${nextShiftTime}`
                  : "Bấm để bắt đầu ca làm"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Đã đăng nhập — không cần PIN
              </p>
            </>
          )}
        </div>
        <Button
          size="lg"
          onClick={isClockedIn ? doCheckout : doCheckin}
          disabled={pending}
          className={
            isClockedIn
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : ""
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isClockedIn ? (
            <LogOut className="size-4" />
          ) : (
            <LogIn className="size-4" />
          )}
          {isClockedIn ? "Tan ca" : "Vào ca"}
        </Button>
      </CardContent>
    </Card>
  );
}
