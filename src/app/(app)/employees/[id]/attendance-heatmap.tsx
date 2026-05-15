"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type DayEntry = { iso: string; hours: number };

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_LABELS = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];

function intensity(hours: number): 0 | 1 | 2 | 3 | 4 {
  if (hours <= 0) return 0;
  if (hours < 2) return 1;
  if (hours < 5) return 2;
  if (hours < 8) return 3;
  return 4;
}

const LEVEL_BG = [
  "bg-muted",
  "bg-amber-200 dark:bg-amber-900/60",
  "bg-amber-400 dark:bg-amber-700",
  "bg-amber-500 dark:bg-amber-500",
  "bg-amber-700 dark:bg-amber-400",
];

/**
 * Render 53 weeks × 7 days starting from Monday of the week 52 weeks ago,
 * up to today. GitHub-style contribution graph.
 */
export function AttendanceHeatmap({ data }: { data: DayEntry[] }) {
  const [hover, setHover] = useState<DayEntry | null>(null);

  const { weeks, monthMarkers, totals } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Anchor: Monday of the week 52 weeks ago
    const anchor = new Date(today);
    anchor.setDate(today.getDate() - 52 * 7);
    const day = anchor.getDay(); // 0=Sun
    const offset = day === 0 ? -6 : 1 - day;
    anchor.setDate(anchor.getDate() + offset);

    const map = new Map(data.map((d) => [d.iso, d.hours]));

    const weeks: DayEntry[][] = [];
    let totalDays = 0;
    let totalHours = 0;
    let activeDays = 0;
    let bestHours = 0;

    const cursor = new Date(anchor);
    while (cursor <= today) {
      const week: DayEntry[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10);
        const hours = map.get(iso) ?? 0;
        week.push({ iso, hours });
        if (cursor <= today) {
          totalDays++;
          totalHours += hours;
          if (hours > 0) activeDays++;
          if (hours > bestHours) bestHours = hours;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    // Month markers: which week index a new month starts at
    const monthMarkers: Array<{ weekIdx: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((w, i) => {
      const firstDay = new Date(w[0].iso);
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        monthMarkers.push({ weekIdx: i, label: MONTH_LABELS[m] });
        lastMonth = m;
      }
    });

    return {
      weeks,
      monthMarkers,
      totals: { totalDays, totalHours, activeDays, bestHours },
    };
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span>
          <strong>{totals.totalHours.toFixed(0)}</strong>{" "}
          <span className="text-muted-foreground">giờ trong năm</span>
        </span>
        <span>
          <strong>{totals.activeDays}</strong>{" "}
          <span className="text-muted-foreground">ngày làm</span>
        </span>
        <span>
          <strong>{totals.bestHours.toFixed(1)}h</strong>{" "}
          <span className="text-muted-foreground">ngày cao nhất</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="ml-8 mb-1 flex">
            {weeks.map((_, i) => {
              const marker = monthMarkers.find((m) => m.weekIdx === i);
              return (
                <div key={i} className="w-[14px] text-[10px] text-muted-foreground">
                  {marker?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Weekday labels */}
            <div className="flex w-7 flex-col gap-[3px] text-[9px] text-muted-foreground">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={i} className="h-[11px] leading-[11px]">
                  {i % 2 === 0 ? d : ""}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    const lvl = intensity(day.hours);
                    return (
                      <div
                        key={di}
                        className={cn(
                          "size-[11px] rounded-sm",
                          LEVEL_BG[lvl],
                          "transition-transform hover:scale-150 hover:ring-2 hover:ring-primary",
                        )}
                        onMouseEnter={() => setHover(day)}
                        onMouseLeave={() => setHover(null)}
                        title={`${day.iso}: ${day.hours.toFixed(1)}h`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="ml-8 mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Ít</span>
            {LEVEL_BG.map((bg, i) => (
              <div key={i} className={cn("size-[11px] rounded-sm", bg)} />
            ))}
            <span>Nhiều</span>
            {hover && (
              <span className="ml-3">
                <strong>{hover.iso}</strong>: {hover.hours.toFixed(1)} giờ
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
