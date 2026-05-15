"use client";

import { useTransition, type ReactNode } from "react";
import { Loader2, Sun, Sunrise, Sunset, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SHIFT_LABELS, cn } from "@/lib/utils";
import { claimCover } from "@/app/(app)/shifts/cover-actions";
import type { OpenCoverRequest } from "@/lib/cover-requests";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

const SHIFT_TYPE_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
};

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const weekday = WEEKDAY_LABELS[date.getDay()] ?? "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${weekday} ${dd}/${mm}`;
}

export function CoverRequestsBanner({
  items,
  currentEmployeeId,
  suggestionsByShiftId,
}: {
  items: OpenCoverRequest[];
  /** Employee id of the viewing user (if linked). Used to disable self-claim. */
  currentEmployeeId: number | null;
  /** Optional map of pre-rendered suggestion cards keyed by shiftId. */
  suggestionsByShiftId?: Record<number, ReactNode>;
}) {
  if (items.length === 0) return null;

  return (
    <Card className="border-2 border-sky-300/70 bg-sky-50/50 dark:border-sky-900/60 dark:bg-sky-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span aria-hidden>🔄</span>
          <span>{items.length} ca cần người thay</span>
        </CardTitle>
        <CardDescription>
          Xem qua danh sách dưới đây và nhận ca giúp đồng nghiệp nếu bạn rảnh
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((it) => {
            const Icon = it.shiftType
              ? (SHIFT_TYPE_ICON[it.shiftType] ?? CalendarClock)
              : CalendarClock;
            const dayLabel = formatDayLabel(it.dateIso);
            const shiftLabel = it.shiftType
              ? (SHIFT_LABELS[it.shiftType] ?? it.shiftType)
              : "Ca";
            const isOwner =
              currentEmployeeId != null &&
              currentEmployeeId === it.originalEmployeeId;
            const suggestions = suggestionsByShiftId?.[it.shiftId] ?? null;
            return (
              <li
                key={it.shiftId}
                className="space-y-2 rounded-lg border border-sky-200/70 bg-white/70 px-3 py-2 dark:border-sky-900/40 dark:bg-sky-950/30"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md",
                      "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {dayLabel} · {shiftLabel} —{" "}
                      <span className="font-semibold">{it.originalName}</span>{" "}
                      cần người thay
                    </p>
                  </div>
                  <ClaimButton shiftId={it.shiftId} disabled={isOwner} />
                </div>
                {suggestions}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function ClaimButton({
  shiftId,
  disabled,
}: {
  shiftId: number;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="default"
      disabled={pending || disabled}
      title={disabled ? "Đây là ca của bạn" : undefined}
      onClick={() =>
        startTransition(async () => {
          const res = await claimCover(shiftId);
          if (res.ok) {
            toast.success("Bạn đã nhận ca thành công");
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <span>Nhận ca</span>
      )}
    </Button>
  );
}
