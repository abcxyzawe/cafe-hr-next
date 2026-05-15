"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RadarPoint } from "@/lib/compare-metrics";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function CompareRadarChart({
  data,
  employees,
}: {
  data: RadarPoint[];
  employees: Array<{ name: string; color: string }>;
}) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="axis"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            tickCount={5}
          />
          {employees.map((emp) => (
            <Radar
              key={emp.name}
              name={emp.name}
              dataKey={emp.name}
              stroke={emp.color}
              fill={emp.color}
              fillOpacity={0.18}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              `${typeof value === "number" ? value.toFixed(1) : value} điểm`,
              String(name),
            ]}
            labelFormatter={(label) => `Chỉ số: ${String(label)}`}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
