import * as React from "react";
import { Moon } from "lucide-react";
import {
  formatLunarLong,
  formatLunarShort,
  gregorianToLunar,
} from "@/lib/lunar-calendar";
import { cn } from "@/lib/utils";

type LunarChipProps = {
  date: Date;
  format?: "short" | "long";
  className?: string;
};

/**
 * Inline chip showing the Vietnamese lunar (âm lịch) date for a given
 * Gregorian date. Server-friendly — no hooks, no client state.
 */
export function LunarChip({
  date,
  format = "short",
  className,
}: LunarChipProps): React.ReactElement {
  const lunar = gregorianToLunar(date);
  const label = format === "long" ? formatLunarLong(lunar) : formatLunarShort(lunar);
  const tooltip =
    format === "long" ? formatLunarShort(lunar) : formatLunarLong(lunar);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-primary",
        className,
      )}
      title={tooltip}
    >
      <Moon className="size-3" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
