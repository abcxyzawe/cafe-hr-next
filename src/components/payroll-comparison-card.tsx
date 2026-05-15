import { Clock, Minus, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatHours, formatVND } from "@/lib/utils";
import type { PayrollPeriodTotals } from "@/lib/payroll-comparison";

type Props = {
  current: PayrollPeriodTotals;
  previous: PayrollPeriodTotals;
};

type Trend = "up" | "down" | "flat";

function computeDelta(current: number, previous: number): {
  delta: number;
  pct: number | null;
  trend: Trend;
} {
  const delta = current - previous;
  if (previous === 0) {
    return { delta, pct: null, trend: delta === 0 ? "flat" : delta > 0 ? "up" : "down" };
  }
  const pct = (delta / previous) * 100;
  const trend: Trend = Math.abs(pct) < 0.05 ? "flat" : pct > 0 ? "up" : "down";
  return { delta, pct, trend };
}

function formatSignedPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  if (rounded < 0) return `\u2212${Math.abs(rounded).toFixed(1)}%`;
  return "0.0%";
}

function trendClasses(trend: Trend): string {
  if (trend === "up") {
    return "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (trend === "down") {
    return "border-rose-300/50 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300";
  }
  return "border-border bg-muted text-muted-foreground";
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up") return <TrendingUp className="size-3.5" aria-hidden />;
  if (trend === "down") return <TrendingDown className="size-3.5" aria-hidden />;
  return <Minus className="size-3.5" aria-hidden />;
}

function DeltaChip({
  pct,
  trend,
  isFirstPeriod,
  deltaLabel,
}: {
  pct: number | null;
  trend: Trend;
  isFirstPeriod: boolean;
  deltaLabel: string;
}) {
  if (isFirstPeriod) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Kỳ đầu tiên
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${trendClasses(trend)}`}
      title={deltaLabel}
    >
      <TrendIcon trend={trend} />
      {pct === null ? "—" : formatSignedPct(pct)}
    </span>
  );
}

type Tile = {
  key: "pay" | "hours" | "count";
  label: string;
  icon: typeof Wallet;
  current: number;
  previous: number;
  format: (value: number) => string;
  signedDelta: (delta: number) => string;
};

export function PayrollComparisonCard({ current, previous }: Props) {
  const allZero =
    current.totalPay === 0 &&
    current.totalHours === 0 &&
    current.employeeCount === 0 &&
    previous.totalPay === 0 &&
    previous.totalHours === 0 &&
    previous.employeeCount === 0;
  if (allZero) return null;

  const previousIsEmpty =
    previous.totalPay === 0 &&
    previous.totalHours === 0 &&
    previous.employeeCount === 0;

  const tiles: Tile[] = [
    {
      key: "pay",
      label: "Tổng lương",
      icon: Wallet,
      current: current.totalPay,
      previous: previous.totalPay,
      format: (v) => formatVND(v),
      signedDelta: (d) =>
        d > 0 ? `+${formatVND(d)}` : d < 0 ? `\u2212${formatVND(Math.abs(d))}` : formatVND(0),
    },
    {
      key: "hours",
      label: "Tổng giờ",
      icon: Clock,
      current: current.totalHours,
      previous: previous.totalHours,
      format: (v) => formatHours(v),
      signedDelta: (d) =>
        d > 0
          ? `+${formatHours(d)}`
          : d < 0
            ? `\u2212${formatHours(Math.abs(d))}`
            : formatHours(0),
    },
    {
      key: "count",
      label: "Nhân viên có lương",
      icon: Users,
      current: current.employeeCount,
      previous: previous.employeeCount,
      format: (v) => `${Math.round(v)}`,
      signedDelta: (d) =>
        d > 0 ? `+${Math.round(d)}` : d < 0 ? `\u2212${Math.abs(Math.round(d))}` : "0",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>So với kỳ trước</CardTitle>
        <CardDescription>
          Kỳ {current.period} so với kỳ {previous.period}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map((t) => {
            const { delta, pct, trend } = computeDelta(t.current, t.previous);
            const Icon = t.icon;
            const deltaLabel = `${t.signedDelta(delta)} so với kỳ trước (${t.format(t.previous)})`;
            return (
              <div
                key={t.key}
                className="rounded-lg border border-border bg-card/60 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden />
                  {t.label}
                </div>
                <div className="mt-1.5 text-2xl font-bold tabular-nums">
                  {t.format(t.current)}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <DeltaChip
                    pct={pct}
                    trend={trend}
                    isFirstPeriod={previousIsEmpty}
                    deltaLabel={deltaLabel}
                  />
                  {!previousIsEmpty && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t.signedDelta(delta)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
