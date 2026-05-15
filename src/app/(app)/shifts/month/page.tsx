import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getHolidayByIso } from "@/lib/holidays";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getShiftDensityForMonth, type DayDensity } from "@/lib/shift-density";
import { ShiftMonthHeatmap } from "@/components/shift-month-heatmap";

export const dynamic = "force-dynamic";

const PERIOD_RE = /^\d{4}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parsePeriod(raw: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (!raw || !PERIOD_RE.test(raw)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [y, m] = raw.split("-").map((s) => Number(s));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year: y, month: m };
}

function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

type DayBucket = {
  iso: string;
  date: Date;
  inMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  total: number;
  morning: number;
  afternoon: number;
  evening: number;
};

function intensityClass(total: number): string {
  if (total === 0) return "";
  if (total <= 3) return "bg-primary/5";
  if (total <= 6) return "bg-primary/10";
  if (total <= 9) return "bg-primary/20";
  return "bg-primary/30";
}

export default async function MonthShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const { year, month } = parsePeriod(sp.period);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // exclusive
  const periodIso = `${year}-${pad2(month)}`;
  const firstOfMonthIso = toIsoLocal(monthStart);

  const todayIso = toIsoLocal(new Date());

  const shifts = await prisma.shift.findMany({
    where: { shiftDate: { gte: monthStart, lt: monthEnd } },
    select: { shiftDate: true, shiftType: true, employeeId: true },
  });

  let density: DayDensity[] = [];
  try {
    density = await getShiftDensityForMonth(year, month);
  } catch {
    density = [];
  }

  // Aggregate
  const buckets = new Map<
    string,
    { total: number; morning: number; afternoon: number; evening: number }
  >();
  for (const s of shifts) {
    const iso = toIsoLocal(s.shiftDate);
    const cur =
      buckets.get(iso) ??
      { total: 0, morning: 0, afternoon: 0, evening: 0 };
    cur.total += 1;
    if (s.shiftType === "morning") cur.morning += 1;
    else if (s.shiftType === "afternoon") cur.afternoon += 1;
    else if (s.shiftType === "evening") cur.evening += 1;
    buckets.set(iso, cur);
  }

  // Build 6×7 grid (Mon-first)
  const firstDow = monthStart.getDay(); // 0=Sun..6=Sat
  const offsetToMon = firstDow === 0 ? 6 : firstDow - 1;
  const gridStart = new Date(year, month - 1, 1 - offsetToMon);

  const days: DayBucket[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    const iso = toIsoLocal(d);
    const dow = d.getDay();
    const agg =
      buckets.get(iso) ?? { total: 0, morning: 0, afternoon: 0, evening: 0 };
    days.push({
      iso,
      date: d,
      inMonth: d.getMonth() === month - 1,
      isWeekend: dow === 0 || dow === 6,
      isToday: iso === todayIso,
      total: agg.total,
      morning: agg.morning,
      afternoon: agg.afternoon,
      evening: agg.evening,
    });
  }

  const totalShifts = shifts.length;
  const prevPeriod = shiftMonth(year, month, -1);
  const nextPeriod = shiftMonth(year, month, 1);
  const headers = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <div className="space-y-6">
      <ShiftMonthHeatmap density={density} year={year} month={month} />
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>
              Lịch tháng {pad2(month)}/{year}
            </CardTitle>
            <CardDescription>
              Mật độ ca theo ngày — click vào ô để mở lịch tuần
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="icon" aria-label="Tháng trước">
              <Link href={`/shifts/month?period=${prevPeriod}`} prefetch={false}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Tháng sau">
              <Link href={`/shifts/month?period=${nextPeriod}`} prefetch={false}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/shifts?date=${firstOfMonthIso}`} prefetch={false}>
                <CalendarDays className="size-4" />
                Xem theo tuần
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {headers.map((h, i) => (
              <div
                key={h}
                className={cn(
                  "py-1",
                  (i === 5 || i === 6) && "text-rose-600 dark:text-rose-400",
                )}
              >
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => (
              <DayCell key={`${d.iso}-${d.inMonth ? "1" : "0"}`} day={d} period={periodIso} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
            <span>
              Tổng <span className="font-semibold text-foreground">{totalShifts}</span> ca trong tháng
            </span>
            <div className="flex items-center gap-2">
              <span>Mật độ:</span>
              <span className="size-3 rounded-sm border" />
              <span className="size-3 rounded-sm bg-primary/5 border" />
              <span className="size-3 rounded-sm bg-primary/10 border" />
              <span className="size-3 rounded-sm bg-primary/20 border" />
              <span className="size-3 rounded-sm bg-primary/30 border" />
              <span>nhiều</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DayCell({ day, period }: { day: DayBucket; period: string }) {
  const holiday = getHolidayByIso(day.iso);
  const dayNum = day.date.getDate();
  const intensity = intensityClass(day.total);

  return (
    <Link
      href={`/shifts?date=${day.iso}`}
      prefetch={false}
      aria-label={`Ngày ${day.iso}, ${day.total} ca`}
      className={cn(
        "group relative flex min-h-24 flex-col gap-1 rounded-md border p-1.5 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !day.inMonth && "opacity-40",
        day.isWeekend && day.inMonth && "bg-muted/30",
        intensity,
        holiday &&
          day.inMonth &&
          "border-rose-200/70 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20",
        day.isToday && "ring-2 ring-primary ring-offset-1",
      )}
      title={`Tháng ${period} · ${day.iso}${holiday ? ` · ${holiday.name}` : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
            day.isToday
              ? "bg-primary text-primary-foreground"
              : "text-foreground",
          )}
        >
          {dayNum}
        </span>
        {day.total > 0 && (
          <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
            {day.total} ca
          </span>
        )}
      </div>

      {holiday && (
        <span className="line-clamp-1 rounded-sm bg-rose-100 px-1 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
          {holiday.name}
        </span>
      )}

      {day.total > 0 && (
        <div className="mt-auto flex flex-wrap gap-1">
          {day.morning > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              title={`${day.morning} ca sáng`}
            >
              <Sun className="size-2.5" />
              {day.morning}
            </span>
          )}
          {day.afternoon > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
              title={`${day.afternoon} ca chiều`}
            >
              <Sunset className="size-2.5" />
              {day.afternoon}
            </span>
          )}
          {day.evening > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
              title={`${day.evening} ca tối`}
            >
              <Moon className="size-2.5" />
              {day.evening}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
