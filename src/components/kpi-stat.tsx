import * as React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type KPIStatVariant = "default" | "elevated" | "subtle" | "accent";
export type KPIStatSize = "sm" | "md" | "lg";
export type KPIStatTrendDirection = "up-is-good" | "down-is-good";

export type KPIStatTrend = {
  /** Signed numeric delta. */
  delta: number;
  /** Optional pre-formatted label, e.g. "+12.5%". If supplied, used verbatim. */
  deltaLabel?: string;
  /** Which direction counts as "good" (green). Default `"up-is-good"`. */
  direction?: KPIStatTrendDirection;
  /** Period descriptor shown next to the chip, e.g. "so với hôm qua". */
  period?: string;
};

export type KPIStatProps = {
  /** Short, uppercase-styled label, e.g. "Doanh thu hôm nay". */
  label: string;
  /** Main metric value. Can be a string, number, or any React node (e.g. a live counter). */
  value: React.ReactNode;
  /** Small supplementary text rendered below the value. */
  hint?: string;
  /** Lucide icon (or any node) rendered in the top-right corner. */
  icon?: React.ReactNode;
  /** Optional trend descriptor. */
  trend?: KPIStatTrend;
  /** Optional inline sparkline values (≥ 2 points). */
  sparklineValues?: number[];
  /** Optional link wrap. Uses a plain `<a>` to stay framework-agnostic. */
  href?: string;
  /** Visual container style. Default `"default"`. */
  variant?: KPIStatVariant;
  /** Size scale for padding + typography. Default `"md"`. */
  size?: KPIStatSize;
  /** Loading state — render shimmering placeholders. */
  loading?: boolean;
  className?: string;
};

const VARIANT_CLASSES: Record<KPIStatVariant, string> = {
  default: "rounded-lg border border-border bg-card",
  elevated: "rounded-lg bg-card shadow-md",
  subtle: "rounded-lg border border-dashed border-border bg-muted/30",
  accent:
    "rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5",
};

const SIZE_CONTAINER: Record<KPIStatSize, string> = {
  sm: "p-3 text-sm",
  md: "p-4",
  lg: "p-6 text-lg",
};

const SIZE_VALUE: Record<KPIStatSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
};

function formatDelta(delta: number): string {
  if (delta === 0) return "0";
  const sign = delta > 0 ? "+" : "-";
  const abs = Math.abs(delta);
  // Fractional value < 1 (treated as a percentage in [0,1)) → percent with 1 decimal.
  if (abs < 1) {
    return `${sign}${(abs * 100).toFixed(1)}%`;
  }
  if (Number.isInteger(abs)) {
    return `${sign}${abs}`;
  }
  return `${sign}${abs.toFixed(1)}`;
}

type TrendVisuals = {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  toneClass: string;
};

function getTrendVisuals(
  delta: number,
  direction: KPIStatTrendDirection,
): TrendVisuals {
  if (delta === 0) {
    return {
      Icon: Minus,
      toneClass: "bg-muted text-muted-foreground",
    };
  }
  const isUp = delta > 0;
  const isGood =
    (direction === "up-is-good" && isUp) ||
    (direction === "down-is-good" && !isUp);
  const Icon = isUp ? ArrowUp : ArrowDown;
  const toneClass = isGood
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : "bg-red-500/15 text-red-700 dark:text-red-400";
  return { Icon, toneClass };
}

function Sparkline({ values }: { values: number[] }): React.ReactElement {
  const width = 60;
  const height = 12;
  const padding = 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const path = values
    .map((v, i) => {
      const x = padding + (i * innerW) / (values.length - 1);
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="Xu hướng"
      className="inline-block align-middle text-muted-foreground"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function valueToText(value: React.ReactNode): string {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

/**
 * Reusable KPI tile. Pure server-renderable — no `"use client"`, no hooks.
 * Renders a label, headline value, optional trend chip, hint, sparkline, and
 * an optional top-right icon. Can be wrapped in an `<a>` via `href`.
 */
export function KPIStat({
  label,
  value,
  hint,
  icon,
  trend,
  sparklineValues,
  href,
  variant = "default",
  size = "md",
  loading = false,
  className,
}: KPIStatProps): React.ReactElement {
  const direction: KPIStatTrendDirection = trend?.direction ?? "up-is-good";
  const trendVisuals = trend ? getTrendVisuals(trend.delta, direction) : null;
  const trendText = trend
    ? trend.deltaLabel ?? formatDelta(trend.delta)
    : null;

  const showSparkline =
    Array.isArray(sparklineValues) && sparklineValues.length >= 2;

  const ariaLabel = `${label}: ${valueToText(value)}`.trim();

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <span
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        {loading ? (
          <div
            className={cn(
              "h-8 w-24 animate-pulse rounded-md bg-muted",
              size === "sm" && "h-6 w-20",
              size === "lg" && "h-10 w-32",
            )}
            aria-hidden="true"
          />
        ) : (
          <div
            className={cn(
              "font-bold tabular-nums text-foreground",
              SIZE_VALUE[size],
            )}
          >
            {value}
          </div>
        )}
      </div>

      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}

      {(trend || showSparkline) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {loading && trend ? (
              <div
                className="h-5 w-16 animate-pulse rounded-full bg-muted"
                aria-hidden="true"
              />
            ) : trend && trendVisuals && trendText !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  trendVisuals.toneClass,
                )}
              >
                <trendVisuals.Icon className="size-3" aria-hidden={true} />
                <span className="tabular-nums">{trendText}</span>
              </span>
            ) : null}
            {trend?.period ? (
              <span className="truncate text-xs text-muted-foreground">
                {trend.period}
              </span>
            ) : null}
          </div>
          {showSparkline ? <Sparkline values={sparklineValues} /> : null}
        </div>
      )}
    </>
  );

  const containerClass = cn(
    VARIANT_CLASSES[variant],
    SIZE_CONTAINER[size],
    "flex flex-col",
    className,
  );

  if (href) {
    return (
      <a
        href={href}
        role="status"
        aria-label={ariaLabel}
        className={cn(
          containerClass,
          "transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <div role="status" aria-label={ariaLabel} className={containerClass}>
      {content}
    </div>
  );
}
