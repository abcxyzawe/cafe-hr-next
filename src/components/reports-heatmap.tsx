import { cn } from "@/lib/utils";

export type ReportsHeatmapDay = {
  iso: string;
  checkIns: number;
  hours: number;
};

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// 5 buckets keyed on number of check-ins.
function intensity(checkIns: number): 0 | 1 | 2 | 3 | 4 {
  if (checkIns <= 0) return 0;
  if (checkIns <= 3) return 1;
  if (checkIns <= 6) return 2;
  if (checkIns <= 10) return 3;
  return 4;
}

const LEVEL_BG = [
  "bg-muted",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
];

function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Day-of-week aligned grid (Mon..Sun rows, weeks back as columns) covering the
 * last `days` days. Color intensity scales with daily check-in count.
 */
export function ReportsHeatmap({
  data,
  days = 90,
}: {
  data: ReportsHeatmapDay[];
  days?: number;
}) {
  const map = new Map(data.map((d) => [d.iso, d]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Anchor: Monday of the week containing the first day in the window.
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - (days - 1));
  const weekday = firstDay.getDay(); // 0=Sun
  const offset = weekday === 0 ? -6 : 1 - weekday;
  const anchor = new Date(firstDay);
  anchor.setDate(firstDay.getDate() + offset);

  const weeks: Array<Array<ReportsHeatmapDay | null>> = [];
  const cursor = new Date(anchor);
  while (cursor <= today) {
    const week: Array<ReportsHeatmapDay | null> = [];
    for (let d = 0; d < 7; d++) {
      const iso = toIsoLocal(cursor);
      if (cursor < firstDay || cursor > today) {
        week.push(null);
      } else {
        week.push(map.get(iso) ?? { iso, checkIns: 0, hours: 0 });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex gap-1">
            {/* Weekday labels */}
            <div className="flex w-7 flex-col gap-[3px] text-[9px] text-muted-foreground">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={i} className="h-[12px] leading-[12px]">
                  {i % 2 === 0 ? d : ""}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) =>
                    day ? (
                      <div
                        key={di}
                        className={cn(
                          "size-[12px] rounded-sm transition-transform hover:scale-150 hover:ring-2 hover:ring-primary",
                          LEVEL_BG[intensity(day.checkIns)],
                        )}
                        title={`${formatDayMonth(day.iso)}: ${day.checkIns} check-in, ${day.hours.toFixed(1)} giờ`}
                      />
                    ) : (
                      <div key={di} className="size-[12px] rounded-sm bg-transparent" />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="ml-8 mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Ít</span>
            {LEVEL_BG.map((bg, i) => (
              <div key={i} className={cn("size-[12px] rounded-sm", bg)} />
            ))}
            <span>Nhiều</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
