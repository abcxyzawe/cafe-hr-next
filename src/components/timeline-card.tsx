import * as React from "react";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

export type TimelineEntry = {
  id: string | number;
  /** Tone influences the dot + accent colors. */
  tone?: TimelineTone;
  /** Icon shown inside the timeline dot. */
  icon?: React.ReactNode;
  /** Bold title line. */
  title: React.ReactNode;
  /** Optional secondary description. */
  description?: React.ReactNode;
  /** Right-aligned metadata (e.g. absolute time, badges). */
  meta?: React.ReactNode;
  /** Optional footer area (chips, actions). */
  footer?: React.ReactNode;
  /** Custom className for the entry wrapper. */
  className?: string;
};

export type TimelineCardProps = {
  entries: TimelineEntry[];
  /** Tighter spacing variant for dense feeds. */
  dense?: boolean;
  /** Reverse to descending visual flow. */
  reverseGutter?: boolean;
  /** Wrapper className. */
  className?: string;
  /** Optional ARIA label for the OL. */
  ariaLabel?: string;
  /** Render an empty-state node when entries is empty. */
  emptyState?: React.ReactNode;
};

const TONE_DOT: Record<TimelineTone, string> = {
  primary: "bg-primary text-primary-foreground border-primary",
  success:
    "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600",
  warning:
    "bg-amber-500 text-white border-amber-500 dark:bg-amber-600",
  danger: "bg-red-500 text-white border-red-500 dark:bg-red-600",
  info: "bg-sky-500 text-white border-sky-500 dark:bg-sky-600",
  muted:
    "bg-muted text-muted-foreground border-border dark:bg-muted/60",
};

const TONE_LINE: Record<TimelineTone, string> = {
  primary: "bg-primary/30",
  success: "bg-emerald-500/30",
  warning: "bg-amber-500/30",
  danger: "bg-red-500/30",
  info: "bg-sky-500/30",
  muted: "bg-border",
};

export function TimelineCard({
  entries,
  dense = false,
  reverseGutter = false,
  className,
  ariaLabel = "Lịch sử hoạt động",
  emptyState,
}: TimelineCardProps): React.ReactElement {
  if (entries.length === 0 && emptyState) {
    return <div className={cn("w-full", className)}>{emptyState}</div>;
  }

  const gap = dense ? "gap-3" : "gap-5";
  const padY = dense ? "pb-3" : "pb-5";
  const dotSize = dense ? "size-7" : "size-9";
  const iconSize = dense ? "size-3.5" : "size-4";

  return (
    <ol
      className={cn("relative w-full", className)}
      aria-label={ariaLabel}
    >
      {entries.map((entry, index) => {
        const tone = entry.tone ?? "muted";
        const isLast = index === entries.length - 1;
        return (
          <li
            key={entry.id}
            className={cn(
              "relative flex items-start",
              gap,
              !isLast && padY,
              entry.className,
            )}
          >
            <div className="relative flex flex-col items-center shrink-0">
              <span
                className={cn(
                  "relative z-10 inline-flex items-center justify-center rounded-full border-2 shadow-sm",
                  dotSize,
                  TONE_DOT[tone],
                )}
                aria-hidden
              >
                {entry.icon ? (
                  <span className={cn("inline-flex", iconSize)}>
                    {entry.icon}
                  </span>
                ) : (
                  <Circle
                    className={cn(iconSize, "fill-current opacity-80")}
                    aria-hidden
                  />
                )}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    "absolute top-1/2 w-0.5 grow",
                    reverseGutter ? "bottom-auto top-0" : "",
                    TONE_LINE[tone],
                  )}
                  style={{
                    top: dense ? "1.75rem" : "2.25rem",
                    bottom: 0,
                  }}
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "font-semibold leading-tight",
                      dense ? "text-sm" : "text-sm md:text-base",
                    )}
                  >
                    {entry.title}
                  </div>
                  {entry.description && (
                    <div
                      className={cn(
                        "text-muted-foreground mt-0.5",
                        dense ? "text-xs" : "text-sm",
                      )}
                    >
                      {entry.description}
                    </div>
                  )}
                </div>
                {entry.meta && (
                  <div
                    className={cn(
                      "shrink-0 text-right text-muted-foreground tabular-nums",
                      dense ? "text-[11px]" : "text-xs",
                    )}
                  >
                    {entry.meta}
                  </div>
                )}
              </div>
              {entry.footer && (
                <div className={cn("mt-2", dense ? "text-xs" : "text-sm")}>
                  {entry.footer}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type TimelineGroup = {
  id: string;
  /** Group label, e.g. a date "Thứ Hai · 14/05/2026". */
  label: React.ReactNode;
  /** Optional small note. */
  note?: React.ReactNode;
  entries: TimelineEntry[];
};

export type GroupedTimelineProps = {
  groups: TimelineGroup[];
  dense?: boolean;
  className?: string;
  emptyState?: React.ReactNode;
};

export function GroupedTimeline({
  groups,
  dense = false,
  className,
  emptyState,
}: GroupedTimelineProps): React.ReactElement {
  const totalEntries = groups.reduce((n, g) => n + g.entries.length, 0);
  if (totalEntries === 0 && emptyState) {
    return <div className={cn("w-full", className)}>{emptyState}</div>;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => (
        <section key={group.id}>
          <header className="flex items-baseline justify-between gap-3 mb-3 border-b pb-1.5">
            <h3
              className={cn(
                "font-semibold tracking-tight",
                dense ? "text-sm" : "text-base",
              )}
            >
              {group.label}
            </h3>
            {group.note && (
              <span className="text-xs text-muted-foreground">
                {group.note}
              </span>
            )}
          </header>
          <TimelineCard entries={group.entries} dense={dense} />
        </section>
      ))}
    </div>
  );
}
