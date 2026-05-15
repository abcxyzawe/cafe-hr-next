import Link from "next/link";
import Image from "next/image";
import { Users, CalendarClock, ClipboardCheck, Wallet, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/prisma";
import { recentActivities } from "@/lib/activity";
import { upcomingBirthdays } from "@/lib/birthday";
import { getTodaySnapshot } from "@/lib/today";
import { getOrCreateTodayQuote } from "@/lib/daily-quote";
import { getSession } from "@/lib/auth";
import { formatVND, formatHours, ROLE_LABELS } from "@/lib/utils";
import { RealtimeActivityFeed } from "@/components/realtime-activity-feed";
import { BirthdayWidget } from "@/components/birthday-widget";
import { BirthdayBanner } from "@/components/birthday-banner";
import { AnniversaryBanner } from "@/components/anniversary-banner";
import { UpcomingAnniversariesWidget } from "@/components/upcoming-anniversaries-widget";
import {
  getTodayAnniversaries,
  getUpcomingAnniversaries,
  type UpcomingAnniversary,
} from "@/lib/anniversaries";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { TodayWidget } from "@/components/today-widget";
import { QuoteWidget } from "@/components/quote-widget";
import { QuickActions } from "@/components/quick-actions";
import { OnboardingHero } from "@/components/onboarding-hero";
import { InsightsWidget } from "@/components/insights-widget";
import { QAWidget } from "@/components/qa-widget";
import { PendingLeavesWidget, type PendingLeaveItem } from "@/components/pending-leaves-widget";
import { CorrectionQueueCard } from "@/components/correction-queue-card";
import { getOpenCorrectionRequests, type CorrectionRequest } from "@/lib/correction-requests";
import { AnomalyInsightsWidget } from "@/components/anomaly-insights-widget";
import { getOrCreateTodayInsights } from "@/lib/insights";
import { getAnomalies, type Anomaly } from "@/lib/anomalies";
import { getTodayShiftSlots, type TodayShiftSlotData } from "@/lib/today-shifts";
import { TodayShiftRibbon } from "@/components/today-shift-ribbon";
import { getHourlyTraffic, type HourlyTrafficSummary } from "@/lib/hourly-traffic";
import { HourlyTrafficWidget } from "@/components/hourly-traffic-widget";
import { DailyChecklistWidget } from "@/components/daily-checklist-widget";
import { DailyTipWidget } from "@/components/daily-tip-widget";
import { getDashboardTrends, type TrendSeries } from "@/lib/dashboard-trends";
import { Sparkline } from "@/components/ui/sparkline";
import { getTopPerformersThisMonth, type LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardWidget } from "@/components/leaderboard-widget";
import { getWeeklySummary, type WeekSummary } from "@/lib/activity-weekly-summary";
import { WeeklySummaryCard } from "@/components/weekly-summary-card";
import {
  getRaiseSuggestions,
  type RaiseSuggestion,
} from "@/lib/raise-suggestions";
import { RaiseSuggestionsCard } from "@/components/raise-suggestions-card";
import { StreakLeadersCard } from "@/components/streak-leaders-card";
import { RecentEarnersCard } from "@/components/recent-earners-card";
import { DailyBriefingCard } from "@/components/daily-briefing-card";
import {
  gatherFacts,
  getCachedBriefing,
  type BriefingFacts,
  type DailyBriefing,
} from "@/lib/daily-briefing";
import { TenureMilestonesCard } from "@/components/tenure-milestones-card";
import {
  getUpcomingTenureMilestones,
} from "@/lib/tenure-queries";
import type { TenureMilestone } from "@/lib/tenure";
import {
  getCustomerFeedbackStats,
  type FeedbackStats,
} from "@/lib/customer-feedback-stats";
import { CustomerFeedbackCard } from "@/components/customer-feedback-card";
import { DashboardCustomizeButton, VisibleWidget } from "@/components/dashboard-customize";
import { AnnouncementBanner } from "@/components/announcement-banner";
import {
  ClosureBanner,
  DeclareClosureButton,
  UpcomingClosuresList,
} from "@/components/closure-banner";
import { getTodayClosure, getUpcomingClosures } from "@/lib/closure";
import { OpenNowBadge } from "@/components/open-now-badge";

export const dynamic = "force-dynamic";

async function getStats() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const period = `${yyyy}-${mm}`;
  const startOfMonth = new Date(yyyy, today.getMonth(), 1);

  const [employees, openAttendance, shiftsToday, monthAttendance] = await Promise.all([
    prisma.employee.count(),
    prisma.attendance.count({ where: { checkOut: null } }),
    prisma.shift.count({
      where: {
        shiftDate: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    }),
    prisma.attendance.aggregate({
      _sum: { hoursWorked: true },
      where: { checkIn: { gte: startOfMonth }, checkOut: { not: null } },
    }),
  ]);

  return {
    employees,
    openAttendance,
    shiftsToday,
    monthHours: Number(monthAttendance._sum.hoursWorked ?? 0),
    period,
  };
}

async function getRecentEmployees() {
  return prisma.employee.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
}

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getStats>>;
  let recent: Awaited<ReturnType<typeof getRecentEmployees>>;
  let activities: Awaited<ReturnType<typeof recentActivities>> = [];
  let birthdays: Awaited<ReturnType<typeof upcomingBirthdays>> = [];
  let today: Awaited<ReturnType<typeof getTodaySnapshot>> | null = null;
  let todayShiftSlots: TodayShiftSlotData[] = [];
  let trends: Awaited<ReturnType<typeof getDashboardTrends>> | null = null;
  let dbError: string | null = null;
  try {
    [stats, recent, activities, birthdays, today, todayShiftSlots, trends] = await Promise.all([
      getStats(),
      getRecentEmployees(),
      recentActivities(8),
      upcomingBirthdays(30),
      getTodaySnapshot(),
      getTodayShiftSlots(),
      getDashboardTrends().catch(() => null),
    ]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
    stats = { employees: 0, openAttendance: 0, shiftsToday: 0, monthHours: 0, period: "" };
    recent = [];
  }

  // Daily quote — non-blocking, never fails the page
  const quote = await getOrCreateTodayQuote();
  const sess = await getSession();
  const isAdmin = sess?.role === "admin";
  const isFirstTime = isAdmin && stats.employees === 0 && !dbError;

  // Insights — only fetch when there's enough data; never fails
  let insights: Awaited<ReturnType<typeof getOrCreateTodayInsights>> | null = null;
  if (!isFirstTime && !dbError) {
    try {
      insights = await getOrCreateTodayInsights();
    } catch {
      insights = null;
    }
  }

  // Anomaly insights — admin only, never breaks the page
  let anomalies: Anomaly[] = [];
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      anomalies = await getAnomalies();
    } catch {
      anomalies = [];
    }
  }

  // Hourly traffic — admin only, never breaks the page
  let hourlyTraffic: HourlyTrafficSummary | null = null;
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      hourlyTraffic = await getHourlyTraffic(7);
    } catch {
      hourlyTraffic = null;
    }
  }

  // Top performers leaderboard — admin only, never breaks the page
  let topPerformers: LeaderboardEntry[] = [];
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      topPerformers = await getTopPerformersThisMonth(5);
    } catch {
      topPerformers = [];
    }
  }

  // Weekly activity summary — admin only
  let weeklySummary: WeekSummary | null = null;
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      weeklySummary = await getWeeklySummary();
    } catch {
      weeklySummary = null;
    }
  }

  // Raise suggestions — admin only, never breaks the page
  let raiseSuggestions: RaiseSuggestion[] = [];
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      raiseSuggestions = await getRaiseSuggestions();
    } catch {
      raiseSuggestions = [];
    }
  }

  // Customer feedback stats — admin only, never breaks the page
  let customerFeedback: FeedbackStats | null = null;
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      customerFeedback = await getCustomerFeedbackStats(30);
    } catch {
      customerFeedback = null;
    }
  }

  // Pending leaves quick-approve — admin only, never breaks the page
  let pendingLeaves: PendingLeaveItem[] = [];
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      const rows = await prisma.leaveRequest.findMany({
        where: { status: "pending" },
        include: {
          employee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      pendingLeaves = rows.map((r) => ({
        id: r.id,
        type: r.type as PendingLeaveItem["type"],
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
        employee: r.employee,
      }));
    } catch {
      pendingLeaves = [];
    }
  }

  // Pending attendance correction requests — admin only, never breaks the page
  let correctionRequests: CorrectionRequest[] = [];
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      correctionRequests = await getOpenCorrectionRequests(10);
    } catch {
      correctionRequests = [];
    }
  }

  // Anniversaries today — fetch list of employees with work anniversary today
  let anniversaries: Awaited<ReturnType<typeof getTodayAnniversaries>> = [];
  if (!isFirstTime && !dbError) {
    try {
      anniversaries = await getTodayAnniversaries();
    } catch {
      anniversaries = [];
    }
  }

  // Upcoming work anniversaries — admin only, never breaks the page
  let upcomingAnniversaries: UpcomingAnniversary[] = [];
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      upcomingAnniversaries = await getUpcomingAnniversaries(30, 5);
    } catch {
      upcomingAnniversaries = [];
    }
  }

  // Upcoming tenure milestones — admin only, never breaks the page
  let tenureMilestones: TenureMilestone[] = [];
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      tenureMilestones = await getUpcomingTenureMilestones(30);
    } catch {
      tenureMilestones = [];
    }
  }

  // Daily AI briefing — admin only, never breaks the page
  let briefingFacts: BriefingFacts | null = null;
  let briefing: DailyBriefing | null = null;
  if (isAdmin && !isFirstTime && !dbError) {
    try {
      briefingFacts = await gatherFacts();
      briefing = getCachedBriefing(new Date());
    } catch {
      briefingFacts = null;
      briefing = null;
    }
  }

  // Today closure — fetch latest declaration for today
  let todayClosure: Awaited<ReturnType<typeof getTodayClosure>> = null;
  let upcomingClosures: Awaited<ReturnType<typeof getUpcomingClosures>> = [];
  if (!dbError) {
    try {
      [todayClosure, upcomingClosures] = await Promise.all([
        getTodayClosure(),
        getUpcomingClosures(30),
      ]);
    } catch {
      todayClosure = null;
      upcomingClosures = [];
    }
  }

  return (
    <div className="space-y-6">
      <AnnouncementBanner />
      <ClosureBanner
        closure={
          todayClosure
            ? {
                id: todayClosure.id,
                reason: todayClosure.reason,
                declaredBy: todayClosure.declaredBy,
                declaredAt: todayClosure.declaredAt.toISOString(),
              }
            : null
        }
        isAdmin={isAdmin}
      />
      {upcomingClosures.length > 0 && (
        <UpcomingClosuresList
          closures={upcomingClosures.map((c) => ({
            id: c.id,
            reason: c.reason,
            declaredBy: c.declaredBy,
            closureDate: c.closureDate,
          }))}
          isAdmin={isAdmin}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <OpenNowBadge />
        <div className="flex items-center gap-2">
          {isAdmin && <DeclareClosureButton />}
          <DashboardCustomizeButton />
        </div>
      </div>

      <VisibleWidget k="quote">
        <QuoteWidget
          initialContent={quote.content}
          initialModel={quote.model}
          isAdmin={isAdmin}
        />
      </VisibleWidget>

      <VisibleWidget k="birthday">
        <BirthdayBanner
          people={birthdays
            .filter((b) => b.daysUntil === 0)
            .map((b) => ({
              id: b.id,
              name: b.name,
              avatarUrl: b.avatarUrl,
              turningAge: b.turningAge,
            }))}
        />
      </VisibleWidget>

      {anniversaries.length > 0 && (
        <AnniversaryBanner
          people={anniversaries.map((a) => ({
            id: a.id,
            name: a.name,
            avatarUrl: a.avatarUrl,
            role: a.role,
            yearsCount: a.yearsCount,
          }))}
        />
      )}

      {isFirstTime && <OnboardingHero />}

      <VisibleWidget k="hero">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/30">
        <div className="grid gap-6 p-6 md:grid-cols-2 md:p-10">
          <div className="flex flex-col justify-center gap-4">
            <Badge variant="outline" className="w-fit gap-1">
              <Sparkles className="size-3" /> Bảng điều khiển
            </Badge>
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Quản lý nhân sự quán cà phê <span className="text-primary">gọn gàng</span>
            </h2>
            <p className="max-w-md text-muted-foreground">
              Theo dõi nhân viên, lập lịch ca, chấm công và tính lương — tất cả trong
              một giao diện hiện đại, đầy đủ chức năng cho quán cà phê hằng ngày.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/employees">
                  Quản lý nhân viên <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/payroll">Xem bảng lương</Link>
              </Button>
            </div>
          </div>
          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-xl shadow-lg md:block">
            <Image
              src="/assets/hero-dashboard.jpg"
              alt="Hero"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>
      </VisibleWidget>

      <VisibleWidget k="quickActions">
        <QuickActions isAdmin={isAdmin} />
      </VisibleWidget>

      {!isFirstTime && !dbError && todayShiftSlots.length > 0 && (
        <VisibleWidget k="shiftRibbon">
          <TodayShiftRibbon slots={todayShiftSlots} />
        </VisibleWidget>
      )}

      {!isFirstTime && !dbError && (
        <VisibleWidget k="checklist">
          <DailyChecklistWidget />
        </VisibleWidget>
      )}

      {!isFirstTime && !dbError && <DailyTipWidget />}

      {isAdmin && !isFirstTime && !dbError && (
        <VisibleWidget k="pendingLeaves">
          <PendingLeavesWidget items={pendingLeaves} />
        </VisibleWidget>
      )}

      {isAdmin && correctionRequests.length > 0 && (
        <CorrectionQueueCard items={correctionRequests} />
      )}

      {insights && (
        <VisibleWidget k="insights">
          <InsightsWidget initial={insights.insights} isAdmin={isAdmin} />
        </VisibleWidget>
      )}

      {isAdmin && !isFirstTime && !dbError && (
        <VisibleWidget k="anomalies">
          <AnomalyInsightsWidget items={anomalies} />
        </VisibleWidget>
      )}

      {isAdmin && upcomingAnniversaries.length > 0 && (
        <UpcomingAnniversariesWidget
          items={upcomingAnniversaries}
          isAdmin={isAdmin}
        />
      )}

      {hourlyTraffic && (
        <VisibleWidget k="hourlyTraffic">
          <HourlyTrafficWidget data={hourlyTraffic} lookbackDays={7} />
        </VisibleWidget>
      )}

      {isAdmin && topPerformers.length > 0 && (
        <VisibleWidget k="leaderboard">
          <LeaderboardWidget entries={topPerformers} />
        </VisibleWidget>
      )}

      {isAdmin && briefingFacts && (
        <DailyBriefingCard
          briefing={briefing}
          facts={briefingFacts}
          isAdmin={isAdmin}
        />
      )}

      {isAdmin && !isFirstTime && !dbError && <StreakLeadersCard />}

      {isAdmin && !isFirstTime && !dbError && <RecentEarnersCard limit={6} />}

      {isAdmin && tenureMilestones.length > 0 && (
        <TenureMilestonesCard items={tenureMilestones} />
      )}

      {isAdmin && raiseSuggestions.length > 0 && (
        <RaiseSuggestionsCard items={raiseSuggestions} />
      )}

      {weeklySummary && <WeeklySummaryCard summary={weeklySummary} />}

      {customerFeedback && (
        <CustomerFeedbackCard stats={customerFeedback} />
      )}

      {!isFirstTime && !dbError && (
        <VisibleWidget k="qa">
          <QAWidget />
        </VisibleWidget>
      )}

      {dbError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Chưa kết nối được database</CardTitle>
            <CardDescription className="text-destructive/80">
              {dbError.slice(0, 240)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Khởi động PostgreSQL bằng Docker:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">docker compose up -d</code>
            </p>
            <p>
              Rồi chạy migration:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">npx prisma migrate dev</code>{" "}
              và seed:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">npm run seed</code>
            </p>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Nhân viên"
          numericValue={stats.employees}
          accent="primary"
          trend={trends?.employees}
        />
        <StatCard
          icon={CalendarClock}
          label="Ca hôm nay"
          numericValue={stats.shiftsToday}
          accent="accent"
          trend={trends?.shifts}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Đang làm việc"
          numericValue={stats.openAttendance}
          accent="secondary"
          trend={trends?.attendance}
        />
        <StatCard
          icon={Wallet}
          label={`Giờ làm tháng ${stats.period.slice(5) || ""}`}
          numericValue={stats.monthHours}
          decimals={1}
          suffix="h"
          accent="primary"
          trend={trends?.hours}
        />
      </section>

      {today && (
        <TodayWidget
          onLeave={today.onLeave}
          onShift={today.onShift}
          birthdays={today.birthdays}
          shiftsToday={today.shiftsToday}
        />
      )}

      {birthdays.length > 0 && <BirthdayWidget items={birthdays} />}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Nhân viên mới</CardTitle>
              <CardDescription>5 nhân viên được thêm gần đây</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/employees">
                Xem tất cả <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="relative size-32 overflow-hidden rounded-lg opacity-90">
                  <Image
                    src="/assets/empty-employees.jpg"
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Chưa có nhân viên nào.
                </p>
                <Button asChild size="sm">
                  <Link href="/employees">
                    Thêm nhân viên đầu tiên <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center gap-4 py-3">
                    <Avatar src={e.avatarUrl} alt={e.name} fallback={e.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ROLE_LABELS[e.role] ?? e.role} · {formatVND(Number(e.hourlyRate))}/giờ
                      </p>
                    </div>
                    <Badge variant="secondary">{ROLE_LABELS[e.role] ?? e.role}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>Audit trail của thao tác trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <RealtimeActivityFeed
              initial={activities.map((a) => ({
                id: a.id,
                action: a.action,
                summary: a.summary,
                createdAt: a.createdAt,
                user: a.user,
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Vai trò trong quán</CardTitle>
          <CardDescription>4 vị trí công việc chính</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { key: "barista", img: "/assets/role-barista.jpg" },
            { key: "server", img: "/assets/role-server.jpg" },
            { key: "cashier", img: "/assets/role-cashier.jpg" },
            { key: "manager", img: "/assets/role-manager.jpg" },
          ].map((r) => (
            <div key={r.key} className="space-y-2 text-center">
              <div className="relative mx-auto aspect-square w-full max-w-[180px] overflow-hidden rounded-lg border">
                <Image src={r.img} alt={r.key} fill className="object-cover" />
              </div>
              <p className="text-sm font-medium">{ROLE_LABELS[r.key]}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  numericValue,
  decimals = 0,
  suffix,
  accent,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  numericValue: number;
  decimals?: number;
  suffix?: string;
  accent: "primary" | "accent" | "secondary";
  trend?: TrendSeries;
}) {
  const accentBg =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "accent"
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  const sparkColor =
    accent === "primary"
      ? "text-primary"
      : accent === "accent"
        ? "text-accent-foreground/70"
        : "text-secondary-foreground/70";

  let changeNode: React.ReactNode = null;
  if (trend && typeof trend.change === "number") {
    const c = trend.change;
    const isUp = c > 2;
    const isDown = c < -2;
    const arrow = isUp ? "▲" : isDown ? "▼" : "■";
    const tone = isUp
      ? "text-emerald-600 dark:text-emerald-400"
      : isDown
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";
    const sign = c > 0 ? "+" : "";
    changeNode = (
      <span className={`text-[10px] font-medium tabular-nums ${tone}`}>
        {arrow} {sign}
        {c}%
      </span>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${accentBg}`}>
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-none tabular-nums">
            <AnimatedCounter value={numericValue} decimals={decimals} suffix={suffix} />
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-2">
              <Sparkline
                values={trend.values}
                width={72}
                height={20}
                className={sparkColor}
              />
              {changeNode}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
