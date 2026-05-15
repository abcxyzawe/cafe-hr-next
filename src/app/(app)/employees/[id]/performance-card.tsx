import { Award, Flame, Clock, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PerformanceMetrics } from "@/lib/performance";

function reliabilityTone(pct: number | null): {
  color: string;
  bg: string;
  label: string;
} {
  if (pct === null) return { color: "text-muted-foreground", bg: "bg-muted", label: "Chưa đủ dữ liệu" };
  if (pct >= 90) return { color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500", label: "Xuất sắc" };
  if (pct >= 75) return { color: "text-sky-700 dark:text-sky-300", bg: "bg-sky-500", label: "Tốt" };
  if (pct >= 50) return { color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500", label: "Trung bình" };
  return { color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500", label: "Cần cải thiện" };
}

export function PerformanceCard({ metrics }: { metrics: PerformanceMetrics }) {
  const tone = reliabilityTone(metrics.reliabilityPct);
  const total =
    metrics.punctuality.early + metrics.punctuality.onTime + metrics.punctuality.late;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="size-5 text-primary" />
          Hiệu suất 30 ngày qua
        </CardTitle>
        <CardDescription>
          Độ tin cậy, đúng giờ và streak làm việc — dựa trên chấm công vs lịch ca
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Reliability score */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Độ tin cậy
                </span>
              </div>
              <span className={cn("text-[10px] font-bold uppercase", tone.color)}>
                {tone.label}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">
                {metrics.reliabilityPct === null ? "—" : metrics.reliabilityPct}
              </span>
              {metrics.reliabilityPct !== null && (
                <span className="text-sm text-muted-foreground">/100</span>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", tone.bg)}
                style={{ width: `${metrics.reliabilityPct ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Đã đi {metrics.attended30d}/{metrics.scheduled30d} ca theo lịch
            </p>
          </div>

          {/* Streak */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Streak hiện tại
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                Kỷ lục 90 ngày: {metrics.longestStreak}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">
                {metrics.currentStreak}
              </span>
              <span className="text-sm text-muted-foreground">ngày liên tiếp</span>
            </div>
            <div className="mt-2 flex gap-0.5">
              {Array.from({ length: 14 }, (_, i) => {
                const filled = i < Math.min(metrics.currentStreak, 14);
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-sm",
                      filled ? "bg-amber-500" : "bg-muted",
                    )}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {metrics.currentStreak === 0
                ? "Chưa có streak — quay lại làm việc để bắt đầu"
                : `🔥 ${metrics.currentStreak} ngày, tiếp tục phát huy!`}
            </p>
          </div>

          {/* Avg shift duration */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trung bình mỗi ca
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">
                {metrics.avgShiftHours.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">giờ</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Tính trên {metrics.recentCheckIns} lần chấm công gần nhất
            </p>
          </div>

          {/* Punctuality */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Đúng giờ
              </span>
            </div>
            {total === 0 ? (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <AlertTriangle className="size-4" />
                Chưa có lịch ca để đánh giá
              </div>
            ) : (
              <>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                  <span
                    className="bg-sky-500"
                    style={{ width: `${(metrics.punctuality.early / total) * 100}%` }}
                    title={`Sớm: ${metrics.punctuality.early}`}
                  />
                  <span
                    className="bg-emerald-500"
                    style={{ width: `${(metrics.punctuality.onTime / total) * 100}%` }}
                    title={`Đúng giờ: ${metrics.punctuality.onTime}`}
                  />
                  <span
                    className="bg-rose-500"
                    style={{ width: `${(metrics.punctuality.late / total) * 100}%` }}
                    title={`Trễ: ${metrics.punctuality.late}`}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <PunctBadge color="bg-sky-500" label="Sớm" value={metrics.punctuality.early} />
                  <PunctBadge color="bg-emerald-500" label="Đúng giờ" value={metrics.punctuality.onTime} />
                  <PunctBadge color="bg-rose-500" label="Trễ" value={metrics.punctuality.late} />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PunctBadge({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-bold tabular-nums">{value}</span>
    </div>
  );
}
