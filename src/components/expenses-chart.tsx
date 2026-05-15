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
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  dayTotal,
} from "@/lib/expenses-tracker";
import type { ExpenseCategory, ExpenseDay } from "@/lib/expenses-tracker";
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
  ingredients: number;
  utilities: number;
  wages: number;
  marketing: number;
  other: number;
  total: number;
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
      {CATEGORY_ORDER.map((cat) => {
        const v = p[cat];
        if (!v) return null;
        return (
          <div key={cat} className="text-muted-foreground">
            <span style={{ color: CATEGORY_COLOR[cat] }}>•</span>{" "}
            {CATEGORY_LABEL[cat]}: {formatVND(v)}
          </div>
        );
      })}
      <div className="mt-1 border-t pt-1 font-medium text-foreground">
        Tổng: {p.total > 0 ? formatVND(p.total) : "—"}
      </div>
    </div>
  );
}

export function ExpensesChart({ data }: { data: ExpenseDay[] }) {
  const points = useMemo<ChartPoint[]>(() => {
    return data.map((d) => ({
      date: d.date,
      label: formatShort(d.date),
      ingredients: d.ingredients,
      utilities: d.utilities,
      wages: d.wages,
      marketing: d.marketing,
      other: d.other,
      total: dayTotal(d),
    }));
  }, [data]);

  return (
    <div className="h-[240px] w-full">
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
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => {
              const cat = value as ExpenseCategory;
              return CATEGORY_LABEL[cat] ?? value;
            }}
          />
          {CATEGORY_ORDER.map((cat) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="expenses"
              fill={CATEGORY_COLOR[cat]}
              isAnimationActive={false}
              radius={[0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
