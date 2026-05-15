import { cn } from "@/lib/utils";

type Props = {
  /** Series of numeric values; lowest = bottom, highest = top. */
  values: number[];
  /** Pixel width of the SVG. Default 80. */
  width?: number;
  /** Pixel height of the SVG. Default 24. */
  height?: number;
  /** Stroke color CSS string. Default "currentColor". */
  stroke?: string;
  /** Stroke width in px. Default 1.5. */
  strokeWidth?: number;
  /** Fill area under the line (semi-transparent). Default false. */
  fill?: boolean;
  /** Highlight last point with a small circle. Default true. */
  highlightLast?: boolean;
  /** Title attribute for hover tooltip. */
  title?: string;
  className?: string;
};

/**
 * Tiny SVG sparkline. Pure server-renderable — no JS, no Recharts, no animation.
 * Renders an empty span if fewer than 2 points.
 */
export function MiniSparkline({
  values,
  width = 80,
  height = 24,
  stroke = "currentColor",
  strokeWidth = 1.5,
  fill = false,
  highlightLast = true,
  title,
  className,
}: Props) {
  if (!values || values.length < 2) {
    return (
      <span
        className={cn(
          "inline-block text-[10px] text-muted-foreground",
          className,
        )}
      >
        —
      </span>
    );
  }

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padding + (i * innerW) / (values.length - 1);
    const y = padding + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = fill
    ? `${path} L${(padding + innerW).toFixed(2)} ${(padding + innerH).toFixed(2)} L${padding.toFixed(2)} ${(padding + innerH).toFixed(2)} Z`
    : null;

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={title ?? "Sparkline"}
      className={cn("inline-block align-middle", className)}
    >
      {title && <title>{title}</title>}
      {areaPath && (
        <path
          d={areaPath}
          fill={stroke}
          fillOpacity={0.15}
          stroke="none"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {highlightLast && (
        <circle
          cx={last.x}
          cy={last.y}
          r={Math.max(1.5, strokeWidth)}
          fill={stroke}
        />
      )}
    </svg>
  );
}
