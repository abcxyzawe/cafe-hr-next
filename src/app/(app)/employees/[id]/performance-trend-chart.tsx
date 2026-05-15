"use client";

import {
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PerformanceTrendPoint = {
  month: string;
  hours: number;
  reliability: number | null;
  punctuality: number | null;
};

export function PerformanceTrendChart({
  data,
}: {
  data: PerformanceTrendPoint[];
}) {
  const maxHours = data.reduce((m, d) => (d.hours > m ? d.hours : m), 0);
  const leftMax = Math.max(1, Math.ceil(maxHours * 1.1));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            domain={[0, leftMax]}
            tickFormatter={(v) => `${v}h`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (value === null || value === undefined) return ["—", name];
              const v = Number(value);
              if (name === "Số giờ làm") return [`${v.toFixed(1)}h`, name];
              if (name === "Độ tin cậy" || name === "Đúng giờ")
                return [`${Math.round(v)}%`, name];
              return [String(value), name];
            }}
          />
          <Legend
            verticalAlign="top"
            align="center"
            height={28}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar
            yAxisId="left"
            dataKey="hours"
            name="Số giờ làm"
            fill="hsl(var(--primary))"
            radius={[6, 6, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="reliability"
            name="Độ tin cậy"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="punctuality"
            name="Đúng giờ"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
