"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "@/lib/forecast-logic";
import { formatVND } from "@/lib/utils";

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

type ChartRow = {
  date: string;
  label: string;
  actual: number | null;
  projected: number | null;
  upperBand: number | null;
  lowerBand: number | null;
  bandHeight: number | null; // delta from lower -> upper, used to stack the upper area
};

function formatShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

type TooltipPayload = {
  payload?: ChartRow;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const isFuture = row.actual == null && row.projected != null;
  return (
    <div style={tooltipStyle}>
      <div className="font-medium text-foreground">{row.date}</div>
      {row.actual != null ? (
        <div className="text-muted-foreground">
          Thực tế: <span className="text-foreground">{formatVND(row.actual)}</span>
        </div>
      ) : null}
      {row.projected != null && isFuture ? (
        <div className="text-muted-foreground">
          Dự báo:{" "}
          <span className="text-foreground">{formatVND(row.projected)}</span>
        </div>
      ) : null}
      {row.upperBand != null && row.lowerBand != null && isFuture ? (
        <div className="text-[11px] text-muted-foreground">
          KTC 95%: {formatVND(row.lowerBand)} – {formatVND(row.upperBand)}
        </div>
      ) : null}
    </div>
  );
}

export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const rows = useMemo<ChartRow[]>(() => {
    return points.map((p) => ({
      date: p.date,
      label: formatShort(p.date),
      actual: p.actual,
      projected: p.projected,
      upperBand: p.upperBand,
      lowerBand: p.lowerBand,
      bandHeight:
        p.upperBand != null && p.lowerBand != null
          ? Math.max(0, p.upperBand - p.lowerBand)
          : null,
    }));
  }, [points]);

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${Math.round(v / 1000)}K`;
              return String(v);
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          {/* Stacked area trick: invisible lower baseline + visible band height */}
          <Area
            type="monotone"
            dataKey="lowerBand"
            stackId="band"
            stroke="none"
            fill="transparent"
            isAnimationActive={false}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="bandHeight"
            stackId="band"
            stroke="none"
            fill="#a855f7"
            fillOpacity={0.18}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#0284c7"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#9333ea"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
