type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  variant?: "line" | "area";
  className?: string;
};

/**
 * Tiny inline sparkline (vanilla SVG, no deps).
 * Inherits color via `currentColor` by default so it picks up theme accents.
 */
export function Sparkline({
  values,
  width = 80,
  height = 24,
  color = "currentColor",
  variant = "area",
  className,
}: SparklineProps) {
  const padX = 1;
  const padY = 2;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const allZero = values.length === 0 || values.every((v) => v === 0);
  const tooShort = values.length < 2;

  if (allZero || tooShort) {
    const midY = padY + innerH / 2;
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="none"
        className={className}
        aria-hidden="true"
      >
        <line
          x1={padX}
          y1={midY}
          x2={width - padX}
          y2={midY}
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = innerW / (values.length - 1);

  const points = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L${(padX + innerW).toFixed(2)} ${(padY + innerH).toFixed(2)} L${padX.toFixed(2)} ${(padY + innerH).toFixed(2)} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {variant === "area" && (
        <path d={areaPath} fill={color} fillOpacity={0.18} stroke="none" />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
