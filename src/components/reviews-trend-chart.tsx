"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = {
  date: string;
  avg: number;
  count: number;
};

type ChartRow = {
  date: string;
  label: string;
  avg: number;
  count: number;
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

function formatShort(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
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
  return (
    <div style={tooltipStyle}>
      <div className="font-medium text-foreground">{row.label}</div>
      <div className="text-muted-foreground">
        Trung bình:{" "}
        <span className="text-foreground">
          {row.count > 0 ? row.avg.toFixed(2) : "—"}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {row.count} đánh giá
      </div>
    </div>
  );
}

export function ReviewsTrendChart({ points }: { points: TrendPoint[] }) {
  const rows = useMemo<ChartRow[]>(
    () =>
      points.map((p) => ({
        date: p.date,
        label: formatShort(p.date),
        avg: p.avg,
        count: p.count,
      })),
    [points],
  );

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#d97706"
            strokeWidth={2}
            dot={{ r: 3, fill: "#d97706" }}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
