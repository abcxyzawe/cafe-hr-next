import { Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatHours, formatVND } from "@/lib/utils";
import { computeProjectedEarnings } from "@/lib/projected-earnings";

type Props = {
  hoursSoFar: number;
  hourlyRate: number;
  today?: Date;
};

export function ProjectedEarningsCard({
  hoursSoFar,
  hourlyRate,
  today,
}: Props) {
  if (!(hoursSoFar > 0)) return null;

  const data = computeProjectedEarnings({ hoursSoFar, hourlyRate, today });
  const elapsedPct =
    data.daysInMonth > 0
      ? Math.min(100, Math.round((data.daysElapsed / data.daysInMonth) * 100))
      : 0;

  return (
    <Card className="border-emerald-300/40 bg-gradient-to-br from-emerald-50/70 via-card to-card dark:border-emerald-500/30 dark:from-emerald-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <Wallet className="size-4" />
          Tiền lương dự kiến tháng này
        </CardTitle>
        <CardDescription>
          Ước tính dựa trên tốc độ làm việc trung bình mỗi ngày trong tháng.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
              Đã làm
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
              {formatVND(data.paySoFar)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatHours(data.hoursSoFar)} đã chấm công
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
              Dự kiến tháng
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
              {formatVND(data.projectedPay)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatHours(data.projectedHours)} ước tính cuối tháng
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Đã qua {data.daysElapsed} / {data.daysInMonth} ngày tháng
            </span>
            <span className="tabular-nums">{elapsedPct}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/50"
            role="progressbar"
            aria-valuenow={elapsedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến độ tháng"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
