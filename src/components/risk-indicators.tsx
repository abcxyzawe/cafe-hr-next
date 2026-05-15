import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Minus,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "critical";

const RISK_PRESETS: Record<
  RiskLevel,
  {
    label: string;
    chip: string;
    icon: React.ComponentType<{ className?: string }>;
    bar: string;
    ring: string;
  }
> = {
  low: {
    label: "Thấp",
    chip:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    icon: ShieldCheck,
    bar: "bg-emerald-500",
    ring: "ring-emerald-500/30",
  },
  medium: {
    label: "Vừa",
    chip:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    icon: AlertCircle,
    bar: "bg-amber-500",
    ring: "ring-amber-500/30",
  },
  high: {
    label: "Cao",
    chip:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    icon: AlertTriangle,
    bar: "bg-red-500",
    ring: "ring-red-500/40",
  },
  critical: {
    label: "Khẩn cấp",
    chip:
      "bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-700 shadow-sm",
    icon: AlertTriangle,
    bar: "bg-gradient-to-r from-red-600 to-rose-700",
    ring: "ring-red-500/60",
  },
};

export type RiskBadgeProps = {
  level: RiskLevel;
  label?: string;
  withIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function RiskBadge({
  level,
  label,
  withIcon = true,
  size = "md",
  className,
}: RiskBadgeProps): React.ReactElement {
  const preset = RISK_PRESETS[level];
  const Icon = preset.icon;
  const sizeCls =
    size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-xs px-2 py-1 gap-1.5";
  const iconCls = size === "sm" ? "size-3" : "size-3.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeCls,
        preset.chip,
        className,
      )}
      role="status"
      aria-label={`Mức rủi ro: ${label ?? preset.label}`}
    >
      {withIcon && <Icon className={iconCls} aria-hidden />}
      <span>{label ?? preset.label}</span>
    </span>
  );
}

export type RiskBarProps = {
  score: number;
  max?: number;
  level?: RiskLevel;
  showValue?: boolean;
  showThresholds?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function levelFromScore(score: number, max: number): RiskLevel {
  const pct = (score / max) * 100;
  if (pct >= 80) return "critical";
  if (pct >= 56) return "high";
  if (pct >= 31) return "medium";
  return "low";
}

export function RiskBar({
  score,
  max = 100,
  level,
  showValue = true,
  showThresholds = false,
  size = "md",
  className,
}: RiskBarProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(max, score));
  const pct = (clamped / max) * 100;
  const resolvedLevel = level ?? levelFromScore(clamped, max);
  const preset = RISK_PRESETS[resolvedLevel];
  const heightCls = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between mb-1">
        {showValue && (
          <span className="text-xs font-semibold tabular-nums">
            {Math.round(clamped)} / {max}
          </span>
        )}
        <RiskBadge level={resolvedLevel} size="sm" />
      </div>
      <div
        className={cn(
          "w-full rounded-full bg-muted overflow-hidden relative",
          heightCls,
        )}
        role="meter"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label="Mức rủi ro"
      >
        <div
          className={cn("h-full transition-all", preset.bar)}
          style={{ width: `${pct}%` }}
        />
        {showThresholds && (
          <>
            <div
              className="absolute inset-y-0 w-px bg-foreground/15"
              style={{ left: "31%" }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 w-px bg-foreground/15"
              style={{ left: "56%" }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 w-px bg-foreground/15"
              style={{ left: "80%" }}
              aria-hidden
            />
          </>
        )}
      </div>
    </div>
  );
}

export type TrendDirection = "up" | "down" | "flat";

export type TrendArrowProps = {
  delta: number;
  /** Whether positive delta is good (default true). */
  upIsGood?: boolean;
  /** Override the formatted label. */
  label?: string;
  /** Period suffix like "so với hôm qua". */
  period?: string;
  size?: "sm" | "md";
  showSign?: boolean;
  className?: string;
};

function formatDelta(delta: number, showSign: boolean): string {
  const abs = Math.abs(delta);
  let body: string;
  if (abs === 0) {
    body = "0";
  } else if (abs < 1) {
    body = `${(abs * 100).toFixed(1)}%`;
  } else if (Number.isInteger(delta)) {
    body = String(abs);
  } else {
    body = abs.toFixed(1);
  }
  if (!showSign || delta === 0) return body;
  return `${delta > 0 ? "+" : "−"}${body}`;
}

export function TrendArrow({
  delta,
  upIsGood = true,
  label,
  period,
  size = "md",
  showSign = true,
  className,
}: TrendArrowProps): React.ReactElement {
  const direction: TrendDirection =
    delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const isGood =
    direction === "flat"
      ? null
      : upIsGood
        ? direction === "up"
        : direction === "down";
  const tone =
    isGood === null
      ? "text-muted-foreground bg-muted"
      : isGood
        ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40"
        : "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950/40";
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const sizeCls =
    size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-0.5" : "text-xs px-2 py-1 gap-1";
  const iconCls = size === "sm" ? "size-3" : "size-3.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium tabular-nums",
        sizeCls,
        tone,
        className,
      )}
      role="status"
      aria-label={`Xu hướng: ${label ?? formatDelta(delta, showSign)}${period ? ` ${period}` : ""}`}
    >
      <Icon className={iconCls} aria-hidden />
      <span>{label ?? formatDelta(delta, showSign)}</span>
      {period && (
        <span className="ml-0.5 opacity-70 font-normal">{period}</span>
      )}
    </span>
  );
}

export type StatusDotProps = {
  level: RiskLevel | "success" | "info" | "muted";
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
  label?: string;
};

const DOT_COLORS: Record<NonNullable<StatusDotProps["level"]>, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
  critical: "bg-rose-700",
  success: "bg-emerald-500",
  info: "bg-blue-500",
  muted: "bg-muted-foreground",
};

export function StatusDot({
  level,
  pulse = false,
  size = "md",
  className,
  label,
}: StatusDotProps): React.ReactElement {
  const sizeCls = size === "sm" ? "size-2" : "size-2.5";
  const color = DOT_COLORS[level];
  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      role="status"
      aria-label={label ?? `Trạng thái: ${level}`}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex rounded-full opacity-60 animate-ping",
            sizeCls,
            color,
          )}
          aria-hidden
        />
      )}
      <span
        className={cn("relative inline-flex rounded-full", sizeCls, color)}
        aria-hidden
      />
    </span>
  );
}

export type HealthScoreProps = {
  score: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function HealthScore({
  score,
  max = 100,
  size = "md",
  className,
}: HealthScoreProps): React.ReactElement {
  const pct = Math.max(0, Math.min(max, score)) / max;
  const radius = size === "sm" ? 18 : size === "lg" ? 32 : 24;
  const stroke = size === "sm" ? 3 : size === "lg" ? 5 : 4;
  const dim = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const color =
    pct >= 0.8
      ? "text-emerald-500"
      : pct >= 0.55
        ? "text-amber-500"
        : "text-red-500";
  const textCls =
    size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-xs";
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      role="meter"
      aria-valuenow={Math.round(score)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label="Điểm sức khỏe"
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className={color}
      >
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
          textCls,
        )}
      >
        {Math.round(score)}
      </span>
      <CheckCircle2 className="sr-only" aria-hidden />
    </div>
  );
}
