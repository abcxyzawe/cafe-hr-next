"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Award,
  ArrowRight,
  Clock,
  Target,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS, formatHours, cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/leaderboard";

type SortMode = "hours" | "reliability" | "tasks";

type SortChip = {
  mode: SortMode;
  label: string;
  icon: typeof Clock;
  description: string;
};

const SORT_CHIPS: ReadonlyArray<SortChip> = [
  {
    mode: "hours",
    label: "Giờ làm",
    icon: Clock,
    description: "có giờ làm cao nhất tháng này",
  },
  {
    mode: "reliability",
    label: "Độ tin cậy",
    icon: Target,
    description: "có độ tin cậy cao nhất 30 ngày qua",
  },
  {
    mode: "tasks",
    label: "Công việc",
    icon: CheckCircle2,
    description: "hoàn thành nhiều công việc nhất tháng này",
  },
];

const PODIUM_VISUAL = [
  {
    icon: Trophy,
    label: "🥇",
    tone: "from-amber-400 to-yellow-500",
    text: "text-amber-50",
    ring: "ring-amber-400",
  },
  {
    icon: Medal,
    label: "🥈",
    tone: "from-slate-300 to-slate-400",
    text: "text-slate-50",
    ring: "ring-slate-300",
  },
  {
    icon: Award,
    label: "🥉",
    tone: "from-orange-400 to-orange-600",
    text: "text-orange-50",
    ring: "ring-orange-400",
  },
];

function periodLabel(): string {
  const now = new Date();
  return now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

function metricValue(entry: LeaderboardEntry, mode: SortMode): number {
  if (mode === "hours") return entry.hours;
  if (mode === "tasks") return entry.tasksDone;
  return entry.reliabilityPct ?? -1;
}

function metricDisplay(entry: LeaderboardEntry, mode: SortMode): string {
  if (mode === "hours") return formatHours(entry.hours);
  if (mode === "tasks") return `${entry.tasksDone} việc`;
  return entry.reliabilityPct == null ? "—" : `${entry.reliabilityPct}%`;
}

function tooltipText(entry: LeaderboardEntry): string {
  const reliability =
    entry.reliabilityPct == null ? "—" : `${entry.reliabilityPct}%`;
  return [
    entry.name,
    `Giờ làm: ${formatHours(entry.hours)} (${entry.shifts} ca)`,
    `Độ tin cậy: ${reliability}`,
    `Công việc: ${entry.tasksDone}`,
  ].join("\n");
}

export function LeaderboardWidget({ entries }: { entries: LeaderboardEntry[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("hours");

  const sorted = useMemo(() => {
    const copy = entries.slice();
    if (sortMode === "reliability") {
      copy.sort((a, b) => {
        const av = a.reliabilityPct;
        const bv = b.reliabilityPct;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return bv - av;
      });
    } else if (sortMode === "tasks") {
      copy.sort((a, b) => b.tasksDone - a.tasksDone);
    } else {
      copy.sort((a, b) => b.hours - a.hours);
    }
    return copy;
  }, [entries, sortMode]);

  if (sorted.length === 0) return null;

  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const maxMetric = Math.max(metricValue(sorted[0], sortMode), 1);
  const activeChip =
    SORT_CHIPS.find((c) => c.mode === sortMode) ?? SORT_CHIPS[0];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            Bảng xếp hạng — {periodLabel()}
          </CardTitle>
          <CardDescription>
            Top {sorted.length} nhân viên {activeChip.description}
          </CardDescription>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
        >
          Xem báo cáo đầy đủ
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sort toggle chips */}
        <div
          role="tablist"
          aria-label="Chế độ xếp hạng"
          className="flex flex-wrap gap-1.5"
        >
          {SORT_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const active = chip.mode === sortMode;
            return (
              <button
                key={chip.mode}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSortMode(chip.mode)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Podium top 3 */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {topThree.map((e, i) => (
            <PodiumCard
              key={e.employeeId}
              entry={e}
              rank={i}
              sortMode={sortMode}
            />
          ))}
        </div>

        {/* Rest as compact rows */}
        {rest.length > 0 && (
          <ul className="divide-y rounded-xl border bg-muted/20">
            {rest.map((e, i) => {
              const rank = i + 4;
              const v = metricValue(e, sortMode);
              const pct = Math.max(0, (v / maxMetric) * 100);
              return (
                <li
                  key={e.employeeId}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                    {rank}
                  </span>
                  <Link
                    href={`/employees/${e.employeeId}`}
                    className="flex flex-1 items-center gap-3 hover:opacity-80"
                    data-employee-id={e.employeeId}
                    title={tooltipText(e)}
                  >
                    <Avatar
                      src={e.avatarUrl}
                      fallback={e.name}
                      alt={e.name}
                      size={28}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                          {metricDisplay(e, sortMode)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PodiumCard({
  entry,
  rank,
  sortMode,
}: {
  entry: LeaderboardEntry;
  rank: 0 | 1 | 2 | number;
  sortMode: SortMode;
}) {
  const v = PODIUM_VISUAL[rank] ?? PODIUM_VISUAL[2];
  // Vary podium height for visual rhythm
  const heights = ["h-32", "h-28", "h-24"];
  const heightCls = heights[rank] ?? "h-24";

  return (
    <Link
      href={`/employees/${entry.employeeId}`}
      className="group flex flex-col items-center text-center"
      title={tooltipText(entry)}
      data-employee-id={entry.employeeId}
    >
      <div className="mb-2">
        <div
          className={cn(
            "rounded-full ring-4 ring-offset-2 ring-offset-card transition-transform group-hover:scale-105",
            v.ring,
          )}
        >
          <Avatar
            src={entry.avatarUrl}
            fallback={entry.name}
            alt={entry.name}
            size={56}
          />
        </div>
      </div>
      <div
        className={cn(
          "flex w-full flex-col items-center justify-end rounded-t-lg bg-gradient-to-t px-2 pb-3 pt-2 shadow-sm",
          heightCls,
          v.tone,
        )}
      >
        <span className={cn("text-2xl drop-shadow", v.text)}>{v.label}</span>
        <p
          className={cn(
            "mt-1 max-w-full truncate text-xs font-bold leading-tight drop-shadow",
            v.text,
          )}
        >
          {entry.name}
        </p>
        <p className={cn("text-[10px] opacity-90", v.text)}>
          {ROLE_LABELS[entry.role] ?? entry.role}
        </p>
        <p
          className={cn(
            "mt-1 inline-flex items-baseline gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold tabular-nums",
            v.text,
          )}
        >
          {metricDisplay(entry, sortMode)}
        </p>
      </div>
    </Link>
  );
}
