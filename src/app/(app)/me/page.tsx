import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Plane,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LiveElapsed } from "@/components/live-elapsed";
import { BreakSuggestionBanner } from "@/components/break-suggestion-banner";
import { HoursGoalTracker } from "@/components/hours-goal-tracker";
import { ForecastChip } from "@/components/forecast-chip";
import { ProjectedEarningsCard } from "@/components/projected-earnings-card";
import { computeMonthForecast } from "@/lib/month-forecast";
import { QuickCheckinCard } from "./quick-checkin-card";
import { UpcomingShiftBanner } from "./upcoming-shift-banner";
import { QuickLeaveDialog } from "./quick-leave-dialog";
import { AttendanceCorrectionDialog } from "./correction-dialog";
import { MonthWorkedCalendar } from "./month-worked-calendar";
import { MyTasksCard, type MyTaskItem } from "./my-tasks-card";
import { MoodPulseCard } from "./mood-pulse-card";
import { DailyWisdomWidget } from "@/components/daily-wisdom-widget";
import { QuickTaskDialog } from "./quick-task-dialog";
import { CoverRequestButton } from "./cover-request-button";
import { ActivityFeed } from "@/components/activity-feed";
import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ROLE_LABELS,
  SHIFT_LABELS,
  cn,
  formatDateTime,
  formatHours,
  formatVND,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

// Quotas (in days) — adjust here if business policy changes
const ANNUAL_LEAVE_QUOTA = 12;
const SICK_LEAVE_QUOTA = 6;

const SHIFT_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
};

const SHIFT_TYPE_TONE: Record<string, string> = {
  morning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  afternoon:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  evening: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const VN_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Mon=0..Sun=6 week starting on Monday
function startOfWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1 - day); // back to Monday
  const out = startOfDay(d);
  out.setDate(out.getDate() + diff);
  return out;
}

function inclusiveDayCount(start: Date, end: Date): number {
  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTodayVi(d: Date): string {
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatShortDateVi(d: Date): string {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default async function MyDayPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const employee = await prisma.employee.findFirst({
    where: { email: session.email },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      hourlyRate: true,
      email: true,
    },
  });

  if (!employee) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-amber-300/40 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
              Chưa link với hồ sơ nhân viên
            </CardTitle>
            <CardDescription>
              Tài khoản{" "}
              <span className="font-medium text-foreground">{session.email}</span>{" "}
              của bạn chưa được liên kết với một hồ sơ nhân viên trong hệ thống.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Vui lòng liên hệ quản trị viên để tạo / cập nhật hồ sơ nhân viên có
              cùng email với tài khoản đăng nhập của bạn.
            </p>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="size-4" /> Về Tổng quan
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const employeeId = employee.id;
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}`;

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    weekShifts,
    activeAttendance,
    monthAttendanceAgg,
    yearLeaves,
    lastPayroll,
    monthHoursAgg,
    recentAttendance,
    lastMonthHoursAgg,
    myTasks,
    monthAttendanceDays,
    monthShiftsForCal,
    myActivityLogs,
  ] = await Promise.all([
    prisma.shift.findMany({
      where: {
        employeeId,
        shiftDate: { gte: weekStart, lt: weekEnd },
      },
      orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
    }),
    prisma.attendance.findFirst({
      where: { employeeId, checkOut: null },
      orderBy: { checkIn: "desc" },
    }),
    prisma.attendance.aggregate({
      _sum: { hoursWorked: true },
      _count: { _all: true },
      where: {
        employeeId,
        checkIn: { gte: startOfMonth, lt: startOfNextMonth },
        checkOut: { not: null },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        startDate: { gte: startOfYear, lt: startOfNextYear },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.payroll.findFirst({
      where: { employeeId },
      orderBy: { period: "desc" },
    }),
    // total month hours up-to-now (same as monthAttendanceAgg sum, kept for clarity)
    prisma.attendance.aggregate({
      _sum: { hoursWorked: true },
      where: {
        employeeId,
        checkIn: { gte: startOfMonth, lt: startOfNextMonth },
        checkOut: { not: null },
      },
    }),
    prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { checkIn: "desc" },
      take: 10,
    }),
    prisma.attendance.aggregate({
      _sum: { hoursWorked: true },
      where: {
        employeeId,
        checkIn: { gte: startOfPrevMonth, lt: startOfMonth },
        checkOut: { not: null },
      },
    }),
    prisma.task.findMany({
      where: {
        assigneeId: employeeId,
        OR: [
          { completedAt: null },
          { completedAt: { gte: sevenDaysAgo } },
        ],
      },
      orderBy: [
        { completedAt: "asc" },
        { dueDate: "asc" },
        { id: "desc" },
      ],
      take: 20,
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        completedAt: true,
      },
    }),
    // All attendance check-ins this month — for the worked-days calendar
    prisma.attendance.findMany({
      where: {
        employeeId,
        checkIn: { gte: startOfMonth, lt: startOfNextMonth },
      },
      select: { checkIn: true },
    }),
    // All shifts scheduled this month — for the calendar's "scheduled" outline
    prisma.shift.findMany({
      where: {
        employeeId,
        shiftDate: { gte: startOfMonth, lt: startOfNextMonth },
      },
      select: { shiftDate: true },
    }),
    // My recent activity — what *I* have done lately (not what happened TO me)
    prisma.activityLog.findMany({
      where: { userId: session.uid },
      orderBy: { id: "desc" },
      take: 10,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);

  function dayIsoLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const workedIsoDays = Array.from(
    new Set(monthAttendanceDays.map((a) => dayIsoLocal(new Date(a.checkIn)))),
  );
  const scheduledIsoDays = Array.from(
    new Set(monthShiftsForCal.map((s) => dayIsoLocal(new Date(s.shiftDate)))),
  );

  const myTasksItems: MyTaskItem[] = myTasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    priority: t.priority,
    completedAt: t.completedAt,
  }));

  const monthHours = Number(monthAttendanceAgg._sum.hoursWorked ?? 0);
  const monthCheckIns = monthAttendanceAgg._count._all;
  const lastMonthHours = Number(lastMonthHoursAgg._sum.hoursWorked ?? 0);
  const monthForecast = computeMonthForecast(monthHours, lastMonthHours, now);

  // Today's shifts subset
  const todaysShifts = weekShifts.filter((s) => sameDay(s.shiftDate, today));
  // Earliest upcoming-or-current shift today (by startTime ascending) for quick check-in hint
  const nextShiftTime: string | null =
    todaysShifts.find((s) => s.startTime != null)?.startTime ?? null;

  // Compute the next shift start as a local-TZ ISO datetime for the reminder banner.
  // Pick the earliest today's shift whose start is still relevant (not more than
  // STARTED_GRACE_MIN minutes in the past).
  const nowMs = now.getTime();
  const STARTED_GRACE_MS = 5 * 60_000;
  const nextShiftStartIso: string | null = (() => {
    const candidates = todaysShifts
      .filter((s) => s.startTime != null)
      .map((s) => {
        const dateIso = dayIsoLocal(new Date(s.shiftDate));
        // startTime is "HH:MM" or "HH:MM:SS" — normalize to "HH:MM:SS"
        const t = s.startTime as string;
        const normalized = t.length === 5 ? `${t}:00` : t;
        const iso = `${dateIso}T${normalized}`;
        const ms = new Date(iso).getTime();
        return { iso, ms };
      })
      .filter((c) => !Number.isNaN(c.ms) && c.ms > nowMs - STARTED_GRACE_MS)
      .sort((a, b) => a.ms - b.ms);
    return candidates[0]?.iso ?? null;
  })();

  // Build week grid: 7 buckets keyed by Mon..Sun
  const weekBuckets: Array<{
    date: Date;
    isToday: boolean;
    shifts: typeof weekShifts;
  }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekBuckets.push({
      date: d,
      isToday: sameDay(d, today),
      shifts: weekShifts.filter((s) => sameDay(s.shiftDate, d)),
    });
  }

  // Leave usage (approved only, within this calendar year, capped at year boundaries)
  const approvedLeaves = yearLeaves.filter((l) => l.status === "approved");
  const annualUsed = approvedLeaves
    .filter((l) => l.type === "annual")
    .reduce((acc, l) => {
      const s = l.startDate < startOfYear ? startOfYear : l.startDate;
      const e =
        l.endDate >= startOfNextYear
          ? new Date(startOfNextYear.getTime() - 86_400_000)
          : l.endDate;
      return acc + inclusiveDayCount(s, e);
    }, 0);
  const sickUsed = approvedLeaves
    .filter((l) => l.type === "sick")
    .reduce((acc, l) => acc + inclusiveDayCount(l.startDate, l.endDate), 0);
  const pendingLeaveCount = yearLeaves.filter((l) => l.status === "pending")
    .length;

  // Estimated payroll for current month (live)
  const hourlyRate = Number(employee.hourlyRate);
  const estimatedMonthPay = monthHours * hourlyRate;

  const greetingHour = now.getHours();
  const timeOfDay =
    greetingHour < 11
      ? "Chào buổi sáng"
      : greetingHour < 14
        ? "Chào buổi trưa"
        : greetingHour < 18
          ? "Chào buổi chiều"
          : "Chào buổi tối";

  const roleLabel = ROLE_LABELS[employee.role] ?? employee.role;

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/30 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit gap-1">
              <Sparkles className="size-3" /> Của tôi
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              {timeOfDay}, <span className="text-primary">{employee.name}</span>{" "}
              <span aria-hidden>👋</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{roleLabel}</Badge>
              <span className="capitalize">{formatTodayVi(now)}</span>
            </div>
          </div>
          {activeAttendance ? (
            <div className="flex items-center gap-3 rounded-xl border bg-emerald-50/70 px-4 py-3 text-sm shadow-sm dark:bg-emerald-950/30">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Đang trong ca
                </p>
                <p className="text-sm font-medium">
                  Đã làm <LiveElapsed start={activeAttendance.checkIn} /> · vào{" "}
                  {activeAttendance.checkIn.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card/60 px-4 py-3 text-sm text-muted-foreground shadow-sm">
              Bạn chưa chấm công vào ca hôm nay.
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/me/streak"
          className="group rounded-xl border bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/30 p-4 hover:shadow-md transition"
        >
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
            <Sparkles className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Chuỗi
            </span>
          </div>
          <div className="text-sm font-medium">Chuỗi làm việc & huy hiệu</div>
          <div className="text-xs text-muted-foreground mt-1 group-hover:translate-x-0.5 transition-transform">
            Xem chi tiết →
          </div>
        </Link>
        <Link
          href="/me/recap-board"
          className="group rounded-xl border bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-4 hover:shadow-md transition"
        >
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <Sparkles className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Tuần qua
            </span>
          </div>
          <div className="text-sm font-medium">Tóm tắt 7 ngày</div>
          <div className="text-xs text-muted-foreground mt-1 group-hover:translate-x-0.5 transition-transform">
            Xem chi tiết →
          </div>
        </Link>
        <Link
          href="/shifts"
          className="group rounded-xl border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-4 hover:shadow-md transition"
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <CalendarClock className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Lịch ca
            </span>
          </div>
          <div className="text-sm font-medium">Ca sắp tới</div>
          <div className="text-xs text-muted-foreground mt-1 group-hover:translate-x-0.5 transition-transform">
            Xem chi tiết →
          </div>
        </Link>
        <Link
          href="/leave"
          className="group rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4 hover:shadow-md transition"
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Plane className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Nghỉ phép
            </span>
          </div>
          <div className="text-sm font-medium">Đơn nghỉ của bạn</div>
          <div className="text-xs text-muted-foreground mt-1 group-hover:translate-x-0.5 transition-transform">
            Xem chi tiết →
          </div>
        </Link>
      </div>

      <QuickCheckinCard
        openCheckInIso={
          activeAttendance ? activeAttendance.checkIn.toISOString() : null
        }
        nextShiftTime={nextShiftTime}
      />

      <UpcomingShiftBanner
        nextShiftStartIso={nextShiftStartIso}
        isClockedIn={activeAttendance != null}
      />

      {activeAttendance != null && (
        <BreakSuggestionBanner
          attendanceId={activeAttendance.id}
          checkInIso={activeAttendance.checkIn.toISOString()}
        />
      )}

      <MoodPulseCard />

      <DailyWisdomWidget />

      {/* Stat blocks */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardCheck}
          label={`Giờ làm tháng ${period.slice(5)}`}
          value={formatHours(monthHours)}
          sublabel={`${monthCheckIns} lượt chấm công`}
          tone="primary"
        />
        <StatCard
          icon={CalendarClock}
          label="Ca tuần này"
          value={`${weekShifts.length}`}
          sublabel={`${todaysShifts.length} ca hôm nay`}
          tone="accent"
        />
        <StatCard
          icon={Plane}
          label="Phép năm đã dùng"
          value={`${annualUsed} / ${ANNUAL_LEAVE_QUOTA}`}
          sublabel={`Ốm: ${sickUsed} / ${SICK_LEAVE_QUOTA}${
            pendingLeaveCount > 0 ? ` · ${pendingLeaveCount} đang chờ` : ""
          }`}
          tone="secondary"
        />
        <StatCard
          icon={Wallet}
          label={
            lastPayroll
              ? `Lương kỳ ${lastPayroll.period}`
              : `Ước tính tháng ${period.slice(5)}`
          }
          value={formatVND(
            lastPayroll ? Number(lastPayroll.totalPay) : estimatedMonthPay,
          )}
          sublabel={
            lastPayroll
              ? `${formatHours(Number(lastPayroll.totalHours))} đã chốt`
              : `${formatHours(monthHours)} × ${formatVND(hourlyRate)}/giờ`
          }
          tone="primary"
        />
      </section>

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <ForecastChip forecast={monthForecast} />
      </div>

      {/* Projected earnings — live extrapolation of this month's pay */}
      <ProjectedEarningsCard
        hoursSoFar={monthHours}
        hourlyRate={hourlyRate}
        today={now}
      />

      {/* Monthly hours goal progress (read-only for employee) */}
      <HoursGoalTracker
        employeeId={employee.id}
        currentHours={monthHours}
        editable={false}
      />

      {/* Today + This week */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" /> Ca hôm nay
            </CardTitle>
            <CardDescription className="capitalize">
              {formatTodayVi(now)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysShifts.length === 0 ? (
              <p className="rounded-md bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
                Hôm nay bạn không có ca nào. Tận hưởng ngày nghỉ nhé!
              </p>
            ) : (
              <ul className="space-y-2">
                {todaysShifts.map((s) => {
                  const Icon = s.shiftType
                    ? (SHIFT_TYPE_ICON[s.shiftType] ?? CalendarClock)
                    : CalendarClock;
                  const tone = s.shiftType
                    ? (SHIFT_TYPE_TONE[s.shiftType] ?? "bg-muted text-foreground")
                    : "bg-muted text-foreground";
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2"
                    >
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md",
                          tone,
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {s.shiftType
                            ? (SHIFT_LABELS[s.shiftType] ?? s.shiftType)
                            : "Ca làm"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.startTime ?? "—"} – {s.endTime ?? "—"}
                        </p>
                      </div>
                      <CoverRequestButton shiftId={s.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4" /> Tuần này
              </CardTitle>
              <CardDescription>
                {formatShortDateVi(weekStart)} –{" "}
                {formatShortDateVi(
                  new Date(weekEnd.getTime() - 86_400_000),
                )}
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/shifts">
                Xem tất cả ca <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekBuckets.map((b, idx) => {
                const hasShift = b.shifts.length > 0;
                return (
                  <div
                    key={b.date.toISOString()}
                    className={cn(
                      "flex flex-col items-stretch gap-1 rounded-lg border p-2 text-center text-xs",
                      b.isToday
                        ? "border-primary bg-primary/5"
                        : "bg-card/40",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide",
                        b.isToday ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {VN_WEEKDAYS[idx]}
                    </div>
                    <div className="text-base font-bold tabular-nums leading-none">
                      {b.date.getDate()}
                    </div>
                    {hasShift ? (
                      <div className="mt-1 space-y-1">
                        {b.shifts.map((s) => {
                          const tone = s.shiftType
                            ? (SHIFT_TYPE_TONE[s.shiftType] ??
                              "bg-muted text-foreground")
                            : "bg-muted text-foreground";
                          return (
                            <div
                              key={s.id}
                              className={cn(
                                "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                                tone,
                              )}
                              title={`${
                                s.shiftType
                                  ? (SHIFT_LABELS[s.shiftType] ?? s.shiftType)
                                  : "Ca"
                              } · ${s.startTime ?? "—"}–${s.endTime ?? "—"}`}
                            >
                              {s.startTime
                                ? s.startTime.slice(0, 5)
                                : (s.shiftType
                                    ? (SHIFT_LABELS[s.shiftType] ?? "Ca")
                                    : "Ca")}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-1 text-[10px] text-muted-foreground/60">
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>Những việc bạn hay làm</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/shifts">
              <CalendarClock className="size-4" /> Xem tất cả ca
            </Link>
          </Button>
          <QuickLeaveDialog />
          <AttendanceCorrectionDialog />
          <Button asChild variant="outline">
            <Link href="/leave">
              <Plane className="size-4" /> Lịch sử đơn nghỉ
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/attendance">
              <ClipboardCheck className="size-4" /> Chấm công
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/employees/${employeeId}/payslip/${period}`}>
              <Wallet className="size-4" /> Phiếu lương tháng này
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/employees/${employeeId}`}>
              Hồ sơ của tôi <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Month worked-days calendar */}
      <MonthWorkedCalendar
        workedIsoDays={workedIsoDays}
        scheduledIsoDays={scheduledIsoDays}
        totalHours={monthHours}
      />

      {/* My tasks */}
      <MyTasksCard tasks={myTasksItems} headerAction={<QuickTaskDialog />} />

      {/* My recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            Hoạt động của tôi ({myActivityLogs.length})
          </CardTitle>
          <CardDescription>
            10 thao tác gần nhất bạn đã thực hiện trên hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            items={myActivityLogs.map((a) => ({
              id: a.id,
              action: a.action,
              summary: a.summary,
              createdAt: a.createdAt,
              user: a.user,
            }))}
          />
        </CardContent>
      </Card>

      {/* Recent attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Chấm công gần đây</CardTitle>
          <CardDescription>10 lượt gần nhất của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <p className="rounded-md bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              Chưa có lượt chấm công nào. Vào{" "}
              <Link
                href="/attendance"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Chấm công
              </Link>{" "}
              để bắt đầu.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vào ca</TableHead>
                  <TableHead>Tan ca</TableHead>
                  <TableHead className="text-right">Số giờ</TableHead>
                  <TableHead className="text-right">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttendance.map((a) => {
                  const isOpen = a.checkOut == null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(a.checkIn)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.checkOut ? formatDateTime(a.checkOut) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {a.hoursWorked != null
                          ? formatHours(Number(a.hoursWorked))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isOpen ? (
                          <Badge variant="success">Đang trong ca</Badge>
                        ) : (
                          <Badge variant="secondary">Hoàn tất</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
  tone: "primary" | "accent" | "secondary";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "accent"
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl",
            toneClass,
          )}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-2xl font-bold leading-tight tabular-nums">
            {value}
          </p>
          {sublabel && (
            <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
