import { Calendar } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { tenureLabel } from "@/lib/tenure";

type TenureChipProps = {
  start: Date;
  className?: string;
};

/**
 * Inline chip showing tenure (e.g. "2 năm 3 tháng") with a calendar icon.
 * Amber-tinted when tenure is at least 3 full years, muted otherwise.
 */
export function TenureChip({ start, className }: TenureChipProps) {
  const now = new Date();
  const label = tenureLabel(start, now);

  const yearsFloor = Math.max(
    0,
    now.getFullYear() -
      start.getFullYear() -
      (now.getMonth() < start.getMonth() ||
      (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())
        ? 1
        : 0),
  );
  const senior = yearsFloor >= 3;
  const tooltip = `Thâm niên: ${label} · Tham gia ${formatDate(start)}`;

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        senior
          ? "border-amber-300/60 bg-amber-100 text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <Calendar
        className={cn(
          "size-3.5",
          senior ? "text-amber-500" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}
