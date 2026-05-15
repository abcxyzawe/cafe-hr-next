"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueEntry } from "@/lib/revenue-tracker";
import { formatVND } from "@/lib/utils";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

type ChartPoint = {
  date: string;
  label: string;
  amount: number;
  hasData: boolean;
};

function formatShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

type TooltipPayload = {
  payload?: ChartPoint;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div style={tooltipStyle}>
      <div className="font-medium text-foreground">{p.date}</div>
      <div className="text-muted-foreground">
        {p.hasData ? formatVND(p.amount) : "Chưa nhập"}
      </div>
    </div>
  );
}

export function RevenueChart({
  data,
  onSelectDay,
  selectedDate,
}: {
  data: RevenueEntry[];
  onSelectDay?: (dateIso: string) => void;
  selectedDate?: string | null;
}) {
  const points = useMemo<ChartPoint[]>(() => {
    return data.map((d) => ({
      date: d.date,
      label: formatShort(d.date),
      amount: d.amount > 0 ? d.amount : 0,
      hasData: d.amount > 0,
    }));
  }, [data]);

  // Recharts won't render bars for amount===0 by default; give empty days a
  // tiny placeholder height so they remain hoverable/clickable.
  const maxAmount = useMemo(() => {
    let max = 0;
    for (const p of points) if (p.amount > max) max = p.amount;
    return max;
  }, [points]);

  const placeholder = maxAmount > 0 ? Math.max(1, Math.round(maxAmount * 0.02)) : 1;

  const renderPoints = useMemo<ChartPoint[]>(() => {
    return points.map((p) =>
      p.hasData ? p : { ...p, amount: placeholder },
    );
  }, [points, placeholder]);

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={renderPoints}
          margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
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
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${Math.round(v / 1000)}K`;
              return String(v);
            }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="amount"
            fill="#10b981"
            isAnimationActive={false}
            radius={[4, 4, 0, 0]}
            onClick={(payload: unknown) => {
              if (
                onSelectDay &&
                payload &&
                typeof payload === "object" &&
                "date" in payload
              ) {
                const date = (payload as { date?: unknown }).date;
                if (typeof date === "string") onSelectDay(date);
              }
            }}
            cursor={onSelectDay ? "pointer" : "default"}
          >
            {renderPoints.map((p) => {
              const isSelected = selectedDate === p.date;
              const fill = !p.hasData
                ? "hsl(var(--muted))"
                : isSelected
                  ? "#059669"
                  : "#10b981";
              return <Cell key={p.date} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
