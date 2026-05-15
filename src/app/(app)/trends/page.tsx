import { redirect } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  CalendarOff,
  Heart,
  AlarmClock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getPerformanceTrends, type TrendPoint } from "@/lib/trends-data";
import { TrendLineChart } from "@/components/trend-line-chart";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Xu hướng hiệu suất — Cafe HR",
};

type NumericKey = {
  [K in keyof TrendPoint]: TrendPoint[K] extends number ? K : never;
}[keyof TrendPoint];

type TileSpec = {
  key: NumericKey;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  format: (value: number) => string;
};

type ChartSpec = {
  key: NumericKey;
  title: string;
  description: string;
  color: string;
  tooltipLabel: string;
  fullWidth?: boolean;
};

const TILES: TileSpec[] = [
  {
    key: "hours",
    label: "Giờ làm",
    color: "#10b981",
    icon: Clock,
    format: (v) => `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} h`,
  },
  {
    key: "checkins",
    label: "Lượt chấm công",
    color: "#0ea5e9",
    icon: CheckCircle2,
    format: (v) => v.toLocaleString("vi-VN"),
  },
  {
    key: "leaves",
    label: "Đơn nghỉ xử lý",
    color: "#a855f7",
    icon: CalendarOff,
    format: (v) => v.toLocaleString("vi-VN"),
  },
  {
    key: "kudos",
    label: "Lời khen trao đi",
    color: "#f59e0b",
    icon: Heart,
    format: (v) => v.toLocaleString("vi-VN"),
  },
  {
    key: "late",
    label: "Lượt đi muộn",
    color: "#ef4444",
    icon: AlarmClock,
    format: (v) => v.toLocaleString("vi-VN"),
  },
];

const CHARTS: ChartSpec[] = [
  {
    key: "hours",
    title: "Tổng giờ làm",
    description: "Tổng số giờ làm việc đã chấm công mỗi tuần.",
    color: "#10b981",
    tooltipLabel: "Giờ làm",
  },
  {
    key: "checkins",
    title: "Lượt chấm công",
    description: "Số lần nhân viên chấm vào ca trong tuần.",
    color: "#0ea5e9",
    tooltipLabel: "Lượt chấm công",
  },
  {
    key: "leaves",
    title: "Đơn nghỉ phép xử lý",
    description: "Đơn nghỉ phép được duyệt hoặc từ chối trong tuần.",
    color: "#a855f7",
    tooltipLabel: "Đơn nghỉ",
  },
  {
    key: "kudos",
    title: "Lời khen trao đi",
    description: "Số lời khen (kudos) ghi nhận trong tuần.",
    color: "#f59e0b",
    tooltipLabel: "Lời khen",
  },
  {
    key: "late",
    title: "Lượt đi muộn",
    description: "Lượt chấm vào trễ hơn 10 phút so với giờ ca.",
    color: "#ef4444",
    tooltipLabel: "Đi muộn",
    fullWidth: true,
  },
];

function sumKey(data: TrendPoint[], key: NumericKey): number {
  let total = 0;
  for (const point of data) total += point[key];
  return total;
}

/** Week-over-week percent delta (last week vs week before). */
function deltaPct(data: TrendPoint[], key: NumericKey): number | null {
  if (data.length < 2) return null;
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  if (!last || !prev) return null;
  const lastVal = last[key];
  const prevVal = prev[key];
  if (prevVal === 0 && lastVal === 0) return null;
  if (prevVal === 0) return lastVal > 0 ? 100 : -100;
  return Math.round(((lastVal - prevVal) / prevVal) * 100);
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" />
        —
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" />
        0%
      </span>
    );
  }
  const positive = delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const tone = positive
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      <Icon className="size-3" />
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

export default async function TrendsPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  const data = await getPerformanceTrends(12);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <TrendingUp className="size-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl md:text-3xl">
                Xu hướng 12 tuần
              </CardTitle>
              <CardDescription>
                Theo dõi giờ làm, chấm công, nghỉ phép, lời khen và đi muộn
                qua 12 tuần ISO gần nhất. So sánh tuần này với tuần trước
                để phát hiện xu hướng kịp thời.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TILES.map((tile) => {
              const total = sumKey(data, tile.key);
              const delta = deltaPct(data, tile.key);
              const Icon = tile.icon;
              return (
                <div
                  key={tile.key}
                  className="rounded-lg border bg-card/60 p-3 backdrop-blur"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Icon className="size-3.5" style={{ color: tile.color }} />
                      {tile.label}
                    </span>
                    <DeltaChip delta={delta} />
                  </div>
                  <div className="mt-1.5 text-xl font-semibold tabular-nums">
                    {tile.format(total)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Tổng 12 tuần
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {CHARTS.map((chart) => (
          <Card
            key={chart.key}
            className={chart.fullWidth ? "lg:col-span-2" : undefined}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{chart.title}</CardTitle>
              <CardDescription className="text-xs">
                {chart.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLineChart
                data={data}
                dataKey={chart.key}
                color={chart.color}
                tooltipLabel={chart.tooltipLabel}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
