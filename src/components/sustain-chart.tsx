"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SustainDay } from "@/lib/sustainability-state";

type ChartPoint = {
  date: string;
  label: string;
  compostKg: number;
  recyclingKg: number;
  total: number;
};

const COLORS = {
  compostKg: "#65a30d", // lime-600
  recyclingKg: "#0284c7", // sky-600
};

const LABELS = {
  compostKg: "Ủ phân (kg)",
  recyclingKg: "Tái chế (kg)",
} as const;

function formatShort(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

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
        <span style={{ color: COLORS.compostKg }}>•</span> {LABELS.compostKg}:{" "}
        {p.compostKg.toFixed(2)}
      </div>
      <div className="text-muted-foreground">
        <span style={{ color: COLORS.recyclingKg }}>•</span>{" "}
        {LABELS.recyclingKg}: {p.recyclingKg.toFixed(2)}
      </div>
      <div className="mt-1 border-t pt-1 font-medium text-foreground">
        Tổng: {p.total.toFixed(2)} kg
      </div>
    </div>
  );
}

export function SustainChart({ data }: { data: SustainDay[] }) {
  const points = useMemo<ChartPoint[]>(() => {
    return data.map((d) => ({
      date: d.date,
      label: formatShort(d.date),
      compostKg: d.compostKg,
      recyclingKg: d.recyclingKg,
      total: d.compostKg + d.recyclingKg,
    }));
  }, [data]);

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={points}
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
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => {
              if (value === "compostKg") return LABELS.compostKg;
              if (value === "recyclingKg") return LABELS.recyclingKg;
              return value;
            }}
          />
          <Bar
            dataKey="compostKg"
            stackId="trash"
            fill={COLORS.compostKg}
            isAnimationActive={false}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="recyclingKg"
            stackId="trash"
            fill={COLORS.recyclingKg}
            isAnimationActive={false}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
