import {
  LogIn,
  Plane,
  ListChecks,
  Heart,
  UserPlus,
  CalendarPlus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { WeekSummary } from "@/lib/activity-weekly-summary";

const WEEK_DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function vnDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEK_DAY_LABELS[dt.getDay()]} ${vnDate(iso)}`;
}

export function WeeklySummaryCard({ summary }: { summary: WeekSummary }) {
  const total = Object.values(summary.totals).reduce((a, b) => a + b, 0);
  if (total === 0 && summary.topActors.length === 0) return null;

  const wow = summary.weekOverWeekPct;
  const wowColor =
    wow === null
      ? "text-muted-foreground"
      : wow > 5
        ? "text-emerald-600 dark:text-emerald-400"
        : wow < -5
          ? "text-rose-600 dark:text-rose-400"
          : "text-muted-foreground";

  const stats: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    tone: string;
  }> = [
    { icon: LogIn, label: "Check-in", value: summary.totals.checkIns, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { icon: Plane, label: "Đơn nghỉ mới", value: summary.totals.leaveCreated, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    { icon: CheckCircle2, label: "Đơn nghỉ duyệt", value: summary.totals.leaveDecided, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
    { icon: ListChecks, label: "Việc hoàn thành", value: summary.totals.taskCompleted, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
    { icon: Heart, label: "Lời khen", value: summary.totals.kudosGiven, tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
    { icon: UserPlus, label: "NV mới", value: summary.totals.employeesCreated, tone: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
    { icon: CalendarPlus, label: "Ca xếp lịch", value: summary.totals.shiftsScheduled, tone: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            Tóm tắt tuần này
          </CardTitle>
          <CardDescription>
            {vnDate(summary.weekStartIso)} – {vnDate(summary.weekEndIso)} ·{" "}
            <span className="tabular-nums">{total} hoạt động</span>
            {wow !== null && (
              <span className={cn("ml-2 inline-flex items-center gap-1 font-semibold", wowColor)}>
                {wow > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {wow > 0 ? "+" : ""}{wow}%{" "}
                <span className="font-normal text-muted-foreground">vs tuần trước</span>
              </span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat grid */}
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-lg border bg-muted/20 p-2.5"
              >
                <div className={cn("inline-flex size-7 items-center justify-center rounded-md", s.tone)}>
                  <Icon className="size-3.5" />
                </div>
                <p className="mt-1.5 text-lg font-bold leading-none tabular-nums">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Top actors + busiest days side-by-side */}
        {(summary.topActors.length > 0 || summary.busiestDays.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {summary.topActors.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Người năng động nhất
                </p>
                <ul className="space-y-1.5">
                  {summary.topActors.map((a, i) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-sm"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary">
                        {i + 1}
                      </span>
                      <Avatar fallback={a.name} size={24} />
                      <span className="flex-1 truncate font-medium">{a.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {a.count} mục
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.busiestDays.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ngày bận rộn nhất
                </p>
                <ul className="space-y-1.5">
                  {summary.busiestDays.map((d, i) => {
                    const max = summary.busiestDays[0]?.count ?? 1;
                    const pct = (d.count / max) * 100;
                    return (
                      <li
                        key={d.iso}
                        className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-sm"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary">
                          {i + 1}
                        </span>
                        <span className="font-medium tabular-nums">
                          {dayLabel(d.iso)}
                        </span>
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {d.count}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
