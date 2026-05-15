"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/trends-data";

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

type NumericKey = {
  [K in keyof TrendPoint]: TrendPoint[K] extends number ? K : never;
}[keyof TrendPoint];

type TooltipPayload = {
  payload?: TrendPoint;
  value?: number | string;
};

function ChartTooltip({
  active,
  payload,
  tooltipLabel,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  tooltipLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const first = payload[0];
  if (!first || !first.payload) return null;
  const point = first.payload;
  const value = first.value;
  return (
    <div style={tooltipStyle}>
      <div className="font-medium text-foreground">
        Tuần {point.weekLabel.replace(/^T/, "")} ({point.weekKey})
      </div>
      <div className="text-muted-foreground">
        {tooltipLabel}: {typeof value === "number" ? value.toLocaleString("vi-VN") : String(value ?? 0)}
      </div>
    </div>
  );
}

export function TrendLineChart({
  data,
  dataKey,
  color,
  tooltipLabel,
}: {
  data: TrendPoint[];
  dataKey: NumericKey;
  color: string;
  tooltipLabel: string;
}) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="weekLabel"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--accent))", strokeWidth: 1 }}
            content={<ChartTooltip tooltipLabel={tooltipLabel} />}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
