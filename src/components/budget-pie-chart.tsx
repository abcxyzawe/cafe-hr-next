"use client";

import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type BudgetPieDatum = {
  category: string;
  amountVnd: number;
  pct: number;
};

const SLICE_COLORS = [
  "#d97706", // amber-600 — Nguyên liệu
  "#0284c7", // sky-600 — Lương nhân viên
  "#059669", // emerald-600 — Tiện ích
  "#e11d48", // rose-600 — Marketing
  "#7c3aed", // violet-600 — Bảo trì
  "#6b7280", // gray-500 — Dự phòng
];

const VND = new Intl.NumberFormat("vi-VN");

function formatVnd(n: number): string {
  return `${VND.format(n)} ₫`;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

type ChartDatum = BudgetPieDatum & { name: string; value: number };

type TooltipPayload = {
  payload?: ChartDatum;
  value?: number | string;
  name?: string;
};

function PieTooltip({
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
      <div className="font-medium text-foreground">{p.category}</div>
      <div className="tabular-nums text-muted-foreground">
        {formatVnd(p.amountVnd)}
      </div>
      <div className="tabular-nums text-muted-foreground">{p.pct}%</div>
    </div>
  );
}

export function BudgetPieChart({ data }: { data: BudgetPieDatum[] }) {
  const points = useMemo<ChartDatum[]>(
    () =>
      data.map((d) => ({
        ...d,
        name: d.category,
        value: d.amountVnd,
      })),
    [data],
  );

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={points}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="78%"
            innerRadius="48%"
            paddingAngle={2}
            strokeWidth={2}
            stroke="hsl(var(--card))"
            isAnimationActive={false}
          >
            {points.map((d, i) => (
              <Cell key={d.category} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export const BUDGET_SLICE_COLORS = SLICE_COLORS;
