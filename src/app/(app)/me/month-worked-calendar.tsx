import { Calendar, Flame } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const VN_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type Props = {
  /** ISO date strings (YYYY-MM-DD, local) of days the user has any attendance this month */
  workedIsoDays: string[];
  /** Optional ISO dates with a scheduled (but not yet worked) shift, shown as faint outline */
  scheduledIsoDays?: string[];
  /** Total hours worked this month, to display in header */
  totalHours: number;
};

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MonthWorkedCalendar({
  workedIsoDays,
  scheduledIsoDays = [],
  totalHours,
}: Props) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayIso = isoLocal(now);
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const worked = new Set(workedIsoDays);
  const scheduled = new Set(scheduledIsoDays);

  // First column = Monday, so leading blank cells = Mon-offset of monthStart
  // getDay(): Sun=0..Sat=6 → Mon-first index = (day === 0 ? 6 : day - 1)
  const firstWeekday = monthStart.getDay();
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;

  type Cell =
    | { kind: "blank" }
    | {
        kind: "day";
        day: number;
        iso: string;
        isWorked: boolean;
        isScheduled: boolean;
        isToday: boolean;
        isFuture: boolean;
      };

  const cells: Cell[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ kind: "blank" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const iso = isoLocal(date);
    cells.push({
      kind: "day",
      day: d,
      iso,
      isWorked: worked.has(iso),
      isScheduled: scheduled.has(iso) && !worked.has(iso),
      isToday: iso === todayIso,
      isFuture: iso > todayIso,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ kind: "blank" });

  const monthLabel = monthStart.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 capitalize">
            <Calendar className="size-5 text-primary" />
            {monthLabel}
          </CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3 text-amber-500" />
              {worked.size} ngày đi làm · tổng {totalHours.toFixed(1)}h
            </span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday header */}
        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {VN_WEEKDAYS.map((w, i) => (
            <span key={w} className={cn(i >= 5 && "text-rose-500/70")}>
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (c.kind === "blank") {
              return <span key={`b${i}`} aria-hidden className="aspect-square" />;
            }
            return (
              <div
                key={c.iso}
                title={
                  c.isWorked
                    ? `${c.iso} — đã đi làm`
                    : c.isScheduled
                      ? `${c.iso} — có ca xếp lịch`
                      : c.iso
                }
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-md text-xs font-medium transition-colors",
                  c.isWorked
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : c.isScheduled
                      ? "border border-dashed border-primary/40 bg-primary/5 text-foreground/80"
                      : c.isFuture
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground/70 bg-muted/40",
                  c.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                )}
              >
                <span className="tabular-nums">{c.day}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary" />
            Đã làm
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm border border-dashed border-primary/40 bg-primary/5" />
            Có ca xếp
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-muted/40" />
            Chưa làm
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span className="size-2 rounded-sm ring-2 ring-primary" />
            Hôm nay
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
