import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type StreakBadgeProps = {
  current: number;
  longest: number;
  className?: string;
};

/**
 * Shows current consecutive-days-worked streak with a flame icon.
 * Hidden entirely when current === 0. Amber-tinted when current >= 7.
 */
export function StreakBadge({ current, longest, className }: StreakBadgeProps) {
  if (current <= 0) return null;
  const hot = current >= 7;
  const tooltip = `Streak hiện tại: ${current} ngày · Kỷ lục: ${longest} ngày`;
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        hot
          ? "border-amber-300/60 bg-amber-100 text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <Flame
        className={cn("size-3.5", hot ? "text-amber-500" : "text-muted-foreground")}
        aria-hidden
      />
      <span className="tabular-nums">{current}</span>
      <span>ngày liên tục</span>
    </span>
  );
}
