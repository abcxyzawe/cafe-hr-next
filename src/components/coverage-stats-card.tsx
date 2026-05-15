import { Activity, TrendingUp, AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CoverageStats } from "@/lib/coverage-stats";

function coverageTone(pct: number): string {
  if (pct >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 70) return "text-sky-600 dark:text-sky-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function coverageBar(pct: number): string {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 70) return "bg-sky-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function CoverageStatsCard({ stats }: { stats: CoverageStats }) {
  if (stats.totalSlots === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          Thống kê độ phủ ca tuần này
        </CardTitle>
        <CardDescription>
          Slot đã xếp / tổng slot khả dụng (ngày lễ được trừ ra)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big coverage % bar */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Độ phủ
            </span>
            <span className={cn("text-3xl font-bold tabular-nums", coverageTone(stats.coveragePct))}>
              {stats.coveragePct}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", coverageBar(stats.coveragePct))}
              style={{ width: `${Math.min(100, stats.coveragePct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {stats.filledSlots} / {stats.totalSlots} slot đã có người
          </p>
        </div>

        {/* 3-col stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={Users}
            label="Nhân viên hoạt động"
            value={stats.activeEmployees}
            sub={`TB ${stats.avgShiftsPerEmployee} ca/người`}
            tone="bg-sky-500/15 text-sky-700 dark:text-sky-300"
          />
          <Stat
            icon={TrendingUp}
            label="Ngày đông nhất"
            value={stats.topDays[0]?.weekdayLabel ?? "—"}
            sub={
              stats.topDays[0]
                ? `${stats.topDays[0].count} ca`
                : "Chưa có ca"
            }
            tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          />
          <Stat
            icon={AlertCircle}
            label="Ngày trống"
            value={stats.emptyDays.length}
            sub={
              stats.emptyDays.length === 0
                ? "Tuyệt vời!"
                : stats.emptyDays
                    .slice(0, 3)
                    .map((d) => d.weekdayLabel.split(" ")[0])
                    .join(", ")
            }
            tone={
              stats.emptyDays.length === 0
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
            }
          />
        </div>

        {/* Top days breakdown */}
        {stats.topDays.length > 1 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top 3 ngày đông nhất
            </p>
            <ul className="space-y-1.5">
              {stats.topDays.map((d, i) => {
                const max = stats.topDays[0]?.count ?? 1;
                const pct = (d.count / max) * 100;
                return (
                  <li
                    key={d.dateIso}
                    className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted/30"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {d.weekdayLabel}
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {d.count} ca
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className={cn("inline-flex size-8 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-4" />
      </div>
      <p className="mt-2 text-2xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground truncate" title={sub}>
        {sub}
      </p>
    </div>
  );
}
