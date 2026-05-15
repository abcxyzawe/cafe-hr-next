import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Accent presets                                                      */
/* ------------------------------------------------------------------ */

export type TrendAccent =
  | "primary"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "sky";

const ACCENT_CLASS: Record<TrendAccent, string> = {
  primary: "text-primary",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  rose: "text-rose-500",
  violet: "text-violet-500",
  sky: "text-sky-500",
};

/* ------------------------------------------------------------------ */
/* TrendChart                                                          */
/* ------------------------------------------------------------------ */

export type TrendSeries = {
  label: string;
  values: number[];
  color?: string;
  accent?: TrendAccent;
};

export type TrendChartProps = {
  series: TrendSeries[];
  xLabels?: string[];
  width?: number;
  height?: number;
  showArea?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  smooth?: boolean;
  highlightLast?: boolean;
  ariaLabel?: string;
  className?: string;
};

type Point = { x: number; y: number };

function buildStraightPath(points: Point[]): string {
  return points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
    )
    .join(" ");
}

/**
 * Catmull-Rom -> cubic bezier with tension = 0.5.
 * Produces a smooth path through every input point.
 */
function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return buildStraightPath(points);

  const tension = 0.5;
  const segments: string[] = [
    `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`,
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;

    segments.push(
      `C${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }
  return segments.join(" ");
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function TrendChart({
  series,
  xLabels,
  width = 480,
  height = 140,
  showArea = false,
  showDots = false,
  showGrid = false,
  showYAxis = false,
  showLegend = false,
  smooth = false,
  highlightLast = false,
  ariaLabel,
  className,
}: TrendChartProps): React.ReactElement {
  const usable = series.filter((s) => s.values.length >= 2);
  const hasData = usable.length > 0;

  if (!hasData) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center text-muted-foreground text-xs",
          className,
        )}
        style={{ width, height }}
        role="img"
        aria-label={ariaLabel ?? "Không có dữ liệu"}
      >
        —
      </div>
    );
  }

  const padding = 16;
  const yAxisGutter = showYAxis ? 28 : 0;
  const legendGutter = showLegend ? 22 : 0;
  const xLabelGutter = xLabels && xLabels.length > 0 ? 16 : 0;

  const innerLeft = padding + yAxisGutter;
  const innerRight = width - padding;
  const innerTop = padding;
  const innerBottom = height - padding - legendGutter - xLabelGutter;
  const innerW = Math.max(1, innerRight - innerLeft);
  const innerH = Math.max(1, innerBottom - innerTop);

  // Shared min/max across all series.
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const s of usable) {
    for (const v of s.values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min === max) {
    // Avoid flat collapse: pad a little so the line sits mid-frame.
    const pad = Math.abs(min) === 0 ? 1 : Math.abs(min) * 0.1;
    min -= pad;
    max += pad;
  }
  const range = max - min;
  const mid = (min + max) / 2;

  const computed = usable.map((s, idx) => {
    const len = s.values.length;
    const points: Point[] = s.values.map((v, i) => {
      const x = innerLeft + (i * innerW) / (len - 1);
      const y = innerTop + innerH - ((v - min) / range) * innerH;
      return { x, y };
    });
    const accent = s.accent ?? null;
    const color = s.color ?? "currentColor";
    const gradId = `trend-grad-${accent ?? "default"}-${idx}`;
    const linePath = smooth
      ? buildSmoothPath(points)
      : buildStraightPath(points);
    const areaPath = showArea
      ? `${linePath} L${points[points.length - 1].x.toFixed(2)} ${innerBottom.toFixed(2)} L${points[0].x.toFixed(2)} ${innerBottom.toFixed(2)} Z`
      : null;
    return { series: s, points, accent, color, gradId, linePath, areaPath };
  });

  const gridLines = showGrid
    ? [0.25, 0.5, 0.75].map((pct) => innerTop + innerH * pct)
    : [];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={
        ariaLabel ??
        `Biểu đồ xu hướng: ${usable.map((s) => s.label).join(", ")}`
      }
      className={cn("block", className)}
    >
      {showArea && (
        <defs>
          {computed.map((c) => (
            <linearGradient
              key={c.gradId}
              id={c.gradId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={c.color}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={c.color}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>
      )}

      {/* Grid */}
      {showGrid &&
        gridLines.map((y, i) => (
          <line
            key={`grid-${i}`}
            x1={innerLeft}
            y1={y}
            x2={innerRight}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray="2 3"
            className="text-muted-foreground"
          />
        ))}

      {/* Y axis labels */}
      {showYAxis && (
        <g className="text-muted-foreground">
          <text
            x={padding}
            y={innerTop + 4}
            className="fill-current text-[10px]"
          >
            {formatTick(max)}
          </text>
          <text
            x={padding}
            y={innerTop + innerH / 2 + 3}
            className="fill-current text-[10px]"
          >
            {formatTick(mid)}
          </text>
          <text
            x={padding}
            y={innerBottom + 3}
            className="fill-current text-[10px]"
          >
            {formatTick(min)}
          </text>
        </g>
      )}

      {/* Series */}
      {computed.map((c) => {
        const accentCls = c.accent ? ACCENT_CLASS[c.accent] : undefined;
        const last = c.points[c.points.length - 1];
        return (
          <g key={`series-${c.series.label}-${c.gradId}`} className={accentCls}>
            {c.areaPath && (
              <path
                d={c.areaPath}
                fill={`url(#${c.gradId})`}
                stroke="none"
              />
            )}
            <path
              d={c.linePath}
              fill="none"
              stroke={c.color}
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {showDots &&
              c.points.map((p, i) => {
                const isLast = i === c.points.length - 1;
                if (highlightLast && isLast) return null;
                return (
                  <circle
                    key={`dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={2}
                    fill={c.color}
                  />
                );
              })}
            {highlightLast && (
              <g>
                <circle
                  cx={last.x}
                  cy={last.y}
                  r={6}
                  fill="none"
                  stroke={c.color}
                  strokeOpacity={0.3}
                  strokeWidth={1.5}
                />
                <circle
                  cx={last.x}
                  cy={last.y}
                  r={3.25}
                  fill={c.color}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* X labels */}
      {xLabels && xLabels.length > 0 && (
        <g className="text-muted-foreground">
          {xLabels.map((label, i) => {
            const len = xLabels.length;
            const x =
              len === 1
                ? innerLeft + innerW / 2
                : innerLeft + (i * innerW) / (len - 1);
            const y = innerBottom + 12;
            return (
              <text
                key={`xlabel-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                className="fill-current text-[10px]"
              >
                {label}
              </text>
            );
          })}
        </g>
      )}

      {/* Legend */}
      {showLegend && (
        <g>
          {computed.map((c, idx) => {
            const accentCls = c.accent ? ACCENT_CLASS[c.accent] : undefined;
            const itemWidth = innerW / Math.max(1, computed.length);
            const cx = innerLeft + idx * itemWidth + 6;
            const cy = height - padding / 2 - 4;
            return (
              <g
                key={`legend-${c.series.label}-${idx}`}
                className={accentCls}
              >
                <rect
                  x={cx}
                  y={cy - 4}
                  width={8}
                  height={2}
                  rx={1}
                  fill={c.color}
                />
                <text
                  x={cx + 12}
                  y={cy}
                  className="fill-current text-[10px] text-muted-foreground"
                >
                  {c.series.label}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* BarChart                                                            */
/* ------------------------------------------------------------------ */

export type BarAccent = TrendAccent;

export type BarChartProps = {
  values: number[];
  labels?: string[];
  width?: number;
  height?: number;
  accent?: BarAccent;
  showLabels?: boolean;
  showValues?: boolean;
  highlightIndex?: number;
  className?: string;
};

const BAR_ACCENT_FILL: Record<BarAccent, string> = {
  primary: "fill-primary",
  emerald: "fill-emerald-500",
  amber: "fill-amber-500",
  rose: "fill-rose-500",
  violet: "fill-violet-500",
  sky: "fill-sky-500",
};

const BAR_ACCENT_FILL_STRONG: Record<BarAccent, string> = {
  primary: "fill-primary",
  emerald: "fill-emerald-700",
  amber: "fill-amber-700",
  rose: "fill-rose-700",
  violet: "fill-violet-700",
  sky: "fill-sky-700",
};

const BAR_ACCENT_RING: Record<BarAccent, string> = {
  primary: "stroke-primary/50",
  emerald: "stroke-emerald-500/50",
  amber: "stroke-amber-500/50",
  rose: "stroke-rose-500/50",
  violet: "stroke-violet-500/50",
  sky: "stroke-sky-500/50",
};

export function BarChart({
  values,
  labels,
  width = 480,
  height = 140,
  accent = "primary",
  showLabels = false,
  showValues = false,
  highlightIndex,
  className,
}: BarChartProps): React.ReactElement {
  if (!values || values.length === 0) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center text-muted-foreground text-xs",
          className,
        )}
        style={{ width, height }}
        role="img"
        aria-label="Không có dữ liệu"
      >
        —
      </div>
    );
  }

  const padding = 16;
  const n = values.length;
  const rotateLabels = !!showLabels && n > 8;
  const labelGutter = showLabels ? (rotateLabels ? 32 : 14) : 0;
  const valueGutter = showValues ? 14 : 0;

  const innerLeft = padding;
  const innerRight = width - padding;
  const innerTop = padding + valueGutter;
  const innerBottom = height - padding - labelGutter;
  const innerW = Math.max(1, innerRight - innerLeft);
  const innerH = Math.max(1, innerBottom - innerTop);

  const gap = n > 1 ? Math.max(2, Math.min(8, innerW / (n * 4))) : 0;
  const barWidth = Math.max(1, (innerW - gap * (n - 1)) / n);

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const zeroY = innerTop + innerH - ((0 - min) / span) * innerH;

  const fillCls = BAR_ACCENT_FILL[accent];
  const strongFillCls = BAR_ACCENT_FILL_STRONG[accent];
  const ringCls = BAR_ACCENT_RING[accent];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Biểu đồ cột (${n} mục)`}
      className={cn("block", className)}
    >
      {values.map((v, i) => {
        const x = innerLeft + i * (barWidth + gap);
        const valueY =
          innerTop + innerH - ((v - min) / span) * innerH;
        const top = Math.min(valueY, zeroY);
        const h = Math.max(1, Math.abs(zeroY - valueY));
        const isHighlight = highlightIndex === i;
        const radius = Math.min(barWidth / 2, 4);

        return (
          <g key={`bar-${i}`}>
            <rect
              x={x}
              y={top}
              width={barWidth}
              height={h}
              rx={radius}
              ry={radius}
              className={cn(isHighlight ? strongFillCls : fillCls)}
            />
            {isHighlight && (
              <rect
                x={x - 1.5}
                y={top - 1.5}
                width={barWidth + 3}
                height={h + 3}
                rx={radius + 1.5}
                ry={radius + 1.5}
                fill="none"
                strokeWidth={1.5}
                className={ringCls}
              />
            )}
            {showValues && (
              <text
                x={x + barWidth / 2}
                y={top - 4}
                textAnchor="middle"
                className="fill-current text-[10px] text-muted-foreground tabular-nums"
              >
                {formatTick(v)}
              </text>
            )}
            {showLabels && labels && labels[i] !== undefined && (
              <text
                x={x + barWidth / 2}
                y={
                  rotateLabels
                    ? innerBottom + 8
                    : innerBottom + 10
                }
                textAnchor={rotateLabels ? "end" : "middle"}
                transform={
                  rotateLabels
                    ? `rotate(-45 ${x + barWidth / 2} ${innerBottom + 8})`
                    : undefined
                }
                className="fill-current text-[10px] text-muted-foreground"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
