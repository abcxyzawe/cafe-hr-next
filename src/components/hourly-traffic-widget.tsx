import { TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HourlyTrafficSummary } from "@/lib/hourly-traffic";

function intensity(avg: number, max: number): {
  bg: string;
  text: string;
  level: 0 | 1 | 2 | 3 | 4;
} {
  if (max <= 0 || avg <= 0)
    return { bg: "bg-muted/50", text: "text-muted-foreground", level: 0 };
  const ratio = avg / max;
  if (ratio < 0.25) return { bg: "bg-primary/15", text: "text-primary", level: 1 };
  if (ratio < 0.5) return { bg: "bg-primary/30", text: "text-primary-foreground", level: 2 };
  if (ratio < 0.75)
    return { bg: "bg-primary/60", text: "text-primary-foreground", level: 3 };
  return { bg: "bg-primary text-primary-foreground", text: "text-primary-foreground", level: 4 };
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function HourlyTrafficWidget({
  data,
  lookbackDays = 7,
}: {
  data: HourlyTrafficSummary;
  lookbackDays?: number;
}) {
  const max = data.peakAvg;
  const totalCheckIns = data.cells.reduce((acc, c) => acc + c.total, 0);

  if (totalCheckIns === 0) return null;

  // Show 06:00 - 23:00 (cafe hours), trim leading/trailing dead hours
  const visible = data.cells.filter((c) => c.hour >= 6 && c.hour <= 23);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Lưu lượng theo giờ
          </CardTitle>
          <CardDescription>
            Số lượt check-in trung bình mỗi giờ trong {lookbackDays} ngày qua
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" />
            Giờ cao điểm: {formatHour(data.peakHour)}
          </Badge>
          <Badge variant="outline">
            {data.peakAvg.toFixed(1)} check-in/giờ
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Bar visualization (responsive) */}
        <div className="overflow-x-auto">
          <div className="flex min-w-[640px] items-end gap-1.5">
            {visible.map((cell) => {
              const heightPct = max > 0 ? Math.max(4, (cell.avg / max) * 100) : 4;
              const tone = intensity(cell.avg, max);
              return (
                <div
                  key={cell.hour}
                  className="flex flex-1 flex-col items-center gap-1.5"
                  title={`${formatHour(cell.hour)} — TB ${cell.avg.toFixed(1)}/ngày, tổng ${cell.total} lượt`}
                >
                  <div className="relative flex h-32 w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-all",
                        tone.bg,
                        cell.isPeak && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
                    {String(cell.hour).padStart(2, "0")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>06:00 → 23:00</span>
          <div className="flex items-center gap-1.5">
            <span>Thấp</span>
            <div className="flex gap-0.5">
              <span className="size-3 rounded-sm bg-primary/15" />
              <span className="size-3 rounded-sm bg-primary/30" />
              <span className="size-3 rounded-sm bg-primary/60" />
              <span className="size-3 rounded-sm bg-primary" />
            </div>
            <span>Cao</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
