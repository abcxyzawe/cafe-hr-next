"use client";

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
import type { ShiftDistributionPoint } from "@/lib/shift-distribution";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const VN_LABELS: Record<string, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  evening: "Tối",
  unset: "Chưa rõ",
};

export function ShiftDistributionChart({
  data,
}: {
  data: ShiftDistributionPoint[];
}) {
  const showUnset = data.some((d) => d.unset > 0);

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="weekLabel"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
            formatter={(value, name) => [
              `${value} ca`,
              VN_LABELS[String(name)] ?? String(name),
            ]}
            labelFormatter={(label) => `Tuần ${String(label).replace(/^T/, "")}`}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => VN_LABELS[String(value)] ?? String(value)}
          />
          <Bar
            stackId="shifts"
            dataKey="morning"
            fill="#f59e0b"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            stackId="shifts"
            dataKey="afternoon"
            fill="#ea580c"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            stackId="shifts"
            dataKey="evening"
            fill="#4f46e5"
            radius={showUnset ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            isAnimationActive={false}
          />
          {showUnset && (
            <Bar
              stackId="shifts"
              dataKey="unset"
              fill="#94a3b8"
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
