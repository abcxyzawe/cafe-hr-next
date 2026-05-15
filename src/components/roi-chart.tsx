"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthSnapshot } from "@/lib/roi-logic";
import { formatVND } from "@/lib/utils";

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

type ChartRow = {
  label: string;
  month: number;
  cumulativeNet: number;
  revenue: number;
};

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
      <div className="font-medium text-foreground">Tháng {row.month}</div>
      <div className="text-muted-foreground">
        Lũy kế ròng:{" "}
        <span className="text-foreground">{formatVND(row.cumulativeNet)}</span>
      </div>
      <div className="text-muted-foreground">
        Doanh thu:{" "}
        <span className="text-foreground">{formatVND(row.revenue)}</span>
      </div>
    </div>
  );
}

export function RoiChart({ monthly }: { monthly: MonthSnapshot[] }) {
  const rows = useMemo<ChartRow[]>(
    () =>
      monthly.map((m) => ({
        label: `T${m.month}`,
        month: m.month,
        cumulativeNet: m.cumulativeNet,
        revenue: m.revenue,
      })),
    [monthly],
  );

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
              const abs = Math.abs(v);
              const sign = v < 0 ? "-" : "";
              if (abs >= 1_000_000_000)
                return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
              if (abs >= 1_000_000)
                return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
              if (abs >= 1_000) return `${sign}${Math.round(abs / 1000)}K`;
              return String(v);
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="2 4"
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="cumulativeNet"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
