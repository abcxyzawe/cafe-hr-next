"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

const ROLE_COLORS: Record<string, string> = {
  barista: "#d97706",
  server: "#0284c7",
  cashier: "#e11d48",
  manager: "#059669",
};

const ROLE_LABELS: Record<string, string> = {
  barista: "Pha chế",
  server: "Phục vụ",
  cashier: "Thu ngân",
  manager: "Quản lý",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function RolePieChart({
  data,
}: {
  data: { role: string; count: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.map((d) => ({
              name: ROLE_LABELS[d.role] ?? d.role,
              value: d.count,
              role: d.role,
            }))}
            dataKey="value"
            nameKey="name"
            outerRadius="75%"
            innerRadius="45%"
            paddingAngle={2}
            strokeWidth={2}
            stroke="hsl(var(--card))"
          >
            {data.map((d) => (
              <Cell key={d.role} fill={ROLE_COLORS[d.role] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => `${v} người`}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyHoursAreaChart({
  data,
}: {
  data: { day: string; hours: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickFormatter={(v) => `${v}h`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => `${Number(v).toFixed(1)}h`}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#hoursGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopEarnersBarChart({
  data,
}: {
  data: { name: string; pay: number; role: string }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            width={110}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
            formatter={(v) => vnd.format(Number(v) || 0)}
          />
          <Bar dataKey="pay" radius={[0, 6, 6, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={ROLE_COLORS[d.role] ?? "hsl(var(--primary))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShiftDistributionChart({
  data,
}: {
  data: { type: string; count: number }[];
}) {
  const labels: Record<string, string> = {
    morning: "Sáng",
    afternoon: "Chiều",
    evening: "Tối",
  };
  const colors: Record<string, string> = {
    morning: "#f59e0b",
    afternoon: "#ea580c",
    evening: "#4f46e5",
  };
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ ...d, label: labels[d.type] ?? d.type }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
            formatter={(v) => `${v} ca`}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={colors[d.type] ?? "hsl(var(--primary))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
