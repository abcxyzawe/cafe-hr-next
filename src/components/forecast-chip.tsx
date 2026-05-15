import * as React from "react";
import { TrendingUp, TrendingDown, Minus, LineChart } from "lucide-react";
import type { MonthForecast } from "@/lib/month-forecast";
import { cn } from "@/lib/utils";

type ForecastChipProps = {
  forecast: MonthForecast;
  className?: string;
};

export function ForecastChip({
  forecast,
  className,
}: ForecastChipProps): React.ReactElement {
  if (forecast.daysElapsed < 3) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
          className,
        )}
      >
        <LineChart className="size-3" aria-hidden />
        Cần thêm dữ liệu để dự báo
      </span>
    );
  }

  const tone =
    forecast.comparison === "ahead"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : forecast.comparison === "behind"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-sky-500/10 text-sky-700 dark:text-sky-400";

  const Arrow =
    forecast.comparison === "ahead"
      ? TrendingUp
      : forecast.comparison === "behind"
        ? TrendingDown
        : Minus;

  const projectedLabel = forecast.projectedHours.toFixed(1);

  let deltaSuffix: string | null = null;
  if (
    typeof forecast.vsLastMonth === "number" &&
    Number.isFinite(forecast.vsLastMonth)
  ) {
    const sign = forecast.vsLastMonth > 0 ? "+" : "";
    deltaSuffix = ` (${sign}${forecast.vsLastMonth.toFixed(0)}% vs tháng trước)`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone,
        className,
      )}
      title={`Pace ${forecast.pacePerDay.toFixed(2)}h/ngày · ${forecast.daysElapsed}/${forecast.daysInMonth} ngày`}
    >
      <Arrow className="size-3" aria-hidden />
      <span>
        Dự báo: {projectedLabel}h cuối tháng
        {deltaSuffix}
      </span>
    </span>
  );
}
