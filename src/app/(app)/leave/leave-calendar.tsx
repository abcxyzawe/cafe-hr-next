import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getHoliday } from "@/lib/holidays";
import { cn } from "@/lib/utils";

type Leave = {
  id: number;
  employeeId: number;
  type: "annual" | "sick" | "personal" | "unpaid";
  status: "pending" | "approved" | "rejected" | "cancelled";
  startDate: Date;
  endDate: Date;
  employee: {
    name: string;
    avatarUrl: string | null;
  };
};

const TYPE_LABELS: Record<string, string> = {
  annual: "Phép",
  sick: "Ốm",
  personal: "Cá nhân",
  unpaid: "K.lương",
};

const TYPE_COLORS: Record<string, string> = {
  annual: "bg-sky-500",
  sick: "bg-rose-500",
  personal: "bg-violet-500",
  unpaid: "bg-amber-500",
};

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  first.setHours(0, 0, 0, 0);
  const day = first.getDay(); // 0=Sun
  const offset = day === 0 ? -6 : 1 - day; // Monday-first
  const grid = new Date(first);
  grid.setDate(first.getDate() + offset);
  return grid;
}

export function LeaveCalendar({
  year,
  month, // 0-indexed
  leaves,
}: {
  year: number;
  month: number;
  leaves: Leave[];
}) {
  const start = startOfMonthGrid(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  // Build 6 weeks (42 days) of cells
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  // Only show approved + pending in the visible grid; group by ISO date
  const visibleLeaves = leaves.filter(
    (l) => l.status === "approved" || l.status === "pending",
  );

  const leavesByDay = new Map<string, Leave[]>();
  for (const l of visibleLeaves) {
    const startMs = new Date(l.startDate).setHours(0, 0, 0, 0);
    const endMs = new Date(l.endDate).setHours(0, 0, 0, 0);
    for (let t = startMs; t <= endMs; t += 86400000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const arr = leavesByDay.get(iso) ?? [];
      arr.push(l);
      leavesByDay.set(iso, arr);
    }
  }

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const prevHref = `/leave?view=calendar&y=${prevYear}&m=${prevMonth + 1}`;
  const nextHref = `/leave?view=calendar&y=${nextYear}&m=${nextMonth + 1}`;
  const todayHref = `/leave?view=calendar&y=${today.getFullYear()}&m=${today.getMonth() + 1}`;

  // Compute approved + pending counts in this month
  let approvedInMonth = 0;
  let pendingInMonth = 0;
  for (const l of visibleLeaves) {
    const lStart = new Date(l.startDate);
    const lEnd = new Date(l.endDate);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);
    if (lStart < monthEnd && lEnd >= monthStart) {
      if (l.status === "approved") approvedInMonth++;
      else pendingInMonth++;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">
            {MONTH_NAMES_VI[month]} {year}
          </h3>
          <div className="flex gap-1 text-xs text-muted-foreground">
            <Badge variant="success">{approvedInMonth} duyệt</Badge>
            {pendingInMonth > 0 && (
              <Badge variant="warning">{pendingInMonth} chờ</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Link
            href={prevHref}
            className="rounded-md border bg-card px-3 py-1 text-sm hover:bg-accent"
          >
            ‹ Trước
          </Link>
          <Link
            href={todayHref}
            className="rounded-md border bg-card px-3 py-1 text-sm hover:bg-accent"
          >
            Hôm nay
          </Link>
          <Link
            href={nextHref}
            className="rounded-md border bg-card px-3 py-1 text-sm hover:bg-accent"
          >
            Sau ›
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={cn(
                  "border-r p-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0",
                  (i === 5 || i === 6) && "text-rose-500/80",
                )}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const inMonth = d.getMonth() === month;
              const isToday = iso === todayIso;
              const holiday = getHoliday(d);
              const dayLeaves = leavesByDay.get(iso) ?? [];

              return (
                <div
                  key={iso}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1.5 last:border-r-0",
                    !inMonth && "bg-muted/30 opacity-60",
                    isToday && "bg-primary/5",
                    holiday && "bg-rose-50/60 dark:bg-rose-950/20",
                  )}
                  title={holiday?.name}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        "font-semibold",
                        isToday && "text-primary",
                        holiday && "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {holiday && (
                      <span className="text-[9px] font-medium text-rose-600 dark:text-rose-400">
                        {holiday.short}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeaves.slice(0, 3).map((l) => (
                      <Link
                        key={l.id}
                        href={`/employees/${l.employeeId}`}
                        className={cn(
                          "flex items-center gap-1 rounded-sm px-1 py-0.5 text-[10px] text-white shadow-sm transition-opacity hover:opacity-90",
                          TYPE_COLORS[l.type],
                          l.status === "pending" && "opacity-70 ring-1 ring-amber-300",
                        )}
                        title={`${l.employee.name} · ${TYPE_LABELS[l.type]} · ${l.status === "pending" ? "Chờ duyệt" : "Duyệt"}`}
                      >
                        <Avatar
                          src={l.employee.avatarUrl}
                          fallback={l.employee.name}
                          size={12}
                          className="size-3 shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {l.employee.name}
                        </span>
                      </Link>
                    ))}
                    {dayLeaves.length > 3 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{dayLeaves.length - 3} người
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">Loại nghỉ:</span>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", TYPE_COLORS[key])} />
            <span>{label}</span>
          </div>
        ))}
        <span className="ml-3 inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sky-500 opacity-70 ring-1 ring-amber-300" />
          <span>Chờ duyệt</span>
        </span>
      </div>
    </div>
  );
}
