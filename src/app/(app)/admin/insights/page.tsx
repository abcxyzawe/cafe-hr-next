import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarHeart,
  CheckCircle2,
  ClipboardList,
  Flame,
  Gift,
  Heart,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  LogIn,
  Plane,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { KPIStat } from "@/components/kpi-stat";
import { LiveCounter } from "@/components/live-counter";
import { TimeAgo } from "@/components/time-ago";
import { EmptyState } from "@/components/empty-state";
import { HealthScore, RiskBadge } from "@/components/risk-indicators";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trung tâm phân tích — Cafe HR",
};

// ---------- Types ----------
type ShiftTypeKey = "morning" | "afternoon" | "evening";

type EmployeesSection = {
  total: number;
  activeToday: number;
};

type ShiftsSection = {
  today: number;
  byType: Record<ShiftTypeKey, number>;
};

type AttendanceSection = {
  checkinsToday: number;
  checkoutsToday: number;
  avgHoursToday: number;
  checkinsYesterday: number;
  deltaPct: number;
};

type LeavesSection = {
  pending: number;
  onLeaveToday: number;
  approvedFuture: number;
};

type TasksSection = {
  open: number;
  overdue: number;
  completedToday: number;
};

type ActivitySection = {
  last24h: number;
  kudosLast7d: number;
  kudosPriorWeek: number;
};

type TopActiveEntry = {
  id: number;
  name: string;
  role: string;
  checkinsToday: number;
};

type DashboardSnapshot = {
  ok: true;
  generatedAt: string;
  date: string;
  employees: EmployeesSection | null;
  shifts: ShiftsSection | null;
  attendance: AttendanceSection | null;
  leaves: LeavesSection | null;
  tasks: TasksSection | null;
  activity: ActivitySection | null;
  topActiveToday: TopActiveEntry[] | null;
  errors?: Record<string, string>;
};

type BurnoutRiskLevel = "low" | "medium" | "high";

type BurnoutEmployeeRef = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type BurnoutItem = {
  employee: BurnoutEmployeeRef;
  riskScore: number;
  riskLevel: BurnoutRiskLevel;
  reasons: string[];
  recommendationVi: string;
};

type BurnoutResponse = {
  ok: true;
  generatedAt: string;
  windowDays: number;
  summary: {
    total: number;
    low: number;
    medium: number;
    high: number;
    avgRisk: number;
  };
  items: BurnoutItem[];
};

type PulseRoleKey = "barista" | "server" | "cashier" | "manager";
type PulseLevel = "low" | "medium" | "high";

type PulseRoleEntry = {
  role: PulseRoleKey;
  headcount: number;
  activeToday: number;
  pulseScore: number;
  pulseLevel: PulseLevel;
  narrative: string;
};

type PulseKudosLeader = {
  id: number;
  name: string;
  role: PulseRoleKey;
  count: number;
};

type PulseBestWorst = {
  role: PulseRoleKey;
  pulse: number;
};

type TeamPulseResponse = {
  ok: true;
  generatedAt: string;
  overall: {
    pulse: number;
    level: PulseLevel;
    totalEmployees: number;
    narrative: string;
  };
  best: PulseBestWorst | null;
  worst: PulseBestWorst | null;
  kudosLeader: PulseKudosLeader | null;
  roles: PulseRoleEntry[];
};

type AnniversaryItem = {
  id: number;
  name: string;
  role: string;
  hiredIso: string;
  yearsCompleting: number;
  nextAnniversaryIso: string;
  daysUntil: number;
  milestone: boolean;
  badgeLabel: string;
};

type AnniversariesResponse = {
  ok: true;
  generatedAt: string;
  summary: {
    totalEmployees: number;
    upcomingCount: number;
    milestoneCount: number;
    averageTenureMonths: number;
  };
  next: AnniversaryItem | null;
  items: AnniversaryItem[];
};

type FetchSuccess<T> = { ok: true; data: T };
type FetchFailure = { ok: false; status: number; message: string };
type FetchResult<T> = FetchSuccess<T> | FetchFailure;

// ---------- Fetch helpers ----------
async function buildBase(): Promise<{ base: string; cookie: string }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  return { base, cookie };
}

async function fetchEndpoint<T>(
  path: string,
  base: string,
  cookie: string,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Phản hồi không hợp lệ");
  }
  return data as T;
}

function settledToResult<T>(s: PromiseSettledResult<T>): FetchResult<T> {
  if (s.status === "fulfilled") {
    return { ok: true, data: s.value };
  }
  const reason = s.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  return { ok: false, status: 0, message };
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function pulseLevelClass(level: PulseLevel): string {
  if (level === "high") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
  }
  if (level === "medium") {
    return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
  }
  return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900";
}

function pulseLevelLabel(level: PulseLevel): string {
  if (level === "high") return "Khỏe mạnh";
  if (level === "medium") return "Ổn định";
  return "Cần chú ý";
}

function formatDateVi(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ---------- Page ----------
export default async function AdminInsightsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const { base, cookie } = await buildBase();

  const [snapSettled, burnoutSettled, pulseSettled, anniversariesSettled] =
    await Promise.allSettled([
      fetchEndpoint<DashboardSnapshot>("/api/dashboard/snapshot", base, cookie),
      fetchEndpoint<BurnoutResponse>("/api/burnout-risk", base, cookie),
      fetchEndpoint<TeamPulseResponse>("/api/team-pulse", base, cookie),
      fetchEndpoint<AnniversariesResponse>("/api/anniversaries", base, cookie),
    ]);

  const snapResult = settledToResult(snapSettled);
  const burnoutResult = settledToResult(burnoutSettled);
  const pulseResult = settledToResult(pulseSettled);
  const anniversariesResult = settledToResult(anniversariesSettled);

  const generatedAt = new Date().toISOString();

  return (
    <div className="space-y-8">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-800 via-slate-700 to-blue-700 p-6 text-white shadow-lg md:p-8 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide backdrop-blur">
              <BarChart3 className="size-3" /> Quản trị · Insights
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Trung tâm phân tích
            </h1>
            <p className="text-sm text-white/80">
              Tổng quan các chỉ số HR · Cập nhật{" "}
              <TimeAgo iso={generatedAt} withPrefix />
            </p>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-2">
          <NavPill
            href="/admin/dashboard-v2"
            icon={<LayoutDashboard className="size-3.5" />}
            label="Bảng điều khiển"
          />
          <NavPill
            href="/burnout-board"
            icon={<Flame className="size-3.5" />}
            label="Cảnh báo kiệt sức"
          />
          <NavPill
            href="/team-pulse-board"
            icon={<HeartPulse className="size-3.5" />}
            label="Sức khỏe đội"
          />
          <NavPill
            href="/anniversaries-board"
            icon={<Gift className="size-3.5" />}
            label="Bảng kỷ niệm"
          />
          <NavPill
            href="/leaderboard"
            icon={<Trophy className="size-3.5" />}
            label="Bảng xếp hạng"
          />
        </nav>
      </section>

      {/* Section 1: Team pulse */}
      <SectionCard
        title="Sức khỏe đội ngũ"
        icon={<HeartPulse className="size-5 text-rose-500" />}
        href="/team-pulse-board"
      >
        {pulseResult.ok ? (
          <TeamPulseBlock data={pulseResult.data} />
        ) : (
          <EmptyState
            variant="subtle"
            size="sm"
            icon={<AlertTriangle style={{ width: 28, height: 28 }} />}
            title="Không tải được số liệu Team Pulse"
            description={pulseResult.message}
          />
        )}
      </SectionCard>

      {/* Section 2: Burnout */}
      <SectionCard
        title="Cảnh báo kiệt sức"
        icon={<Flame className="size-5 text-orange-500" />}
        href="/burnout-board"
      >
        {burnoutResult.ok ? (
          <BurnoutBlock data={burnoutResult.data} />
        ) : (
          <EmptyState
            variant="subtle"
            size="sm"
            icon={<AlertTriangle style={{ width: 28, height: 28 }} />}
            title="Không tải được số liệu Burnout"
            description={burnoutResult.message}
          />
        )}
      </SectionCard>

      {/* Section 3: Today snapshot */}
      <SectionCard
        title="Hoạt động hôm nay"
        icon={<Activity className="size-5 text-sky-500" />}
        href="/admin/dashboard-v2"
      >
        {snapResult.ok ? (
          <SnapshotBlock data={snapResult.data} />
        ) : (
          <EmptyState
            variant="subtle"
            size="sm"
            icon={<AlertTriangle style={{ width: 28, height: 28 }} />}
            title="Không tải được snapshot dashboard"
            description={snapResult.message}
          />
        )}
      </SectionCard>

      {/* Section 4: Anniversaries */}
      <SectionCard
        title="Sắp kỷ niệm"
        icon={<CalendarHeart className="size-5 text-fuchsia-500" />}
        href="/anniversaries-board"
      >
        {anniversariesResult.ok ? (
          <AnniversariesBlock data={anniversariesResult.data} />
        ) : (
          <EmptyState
            variant="subtle"
            size="sm"
            icon={<AlertTriangle style={{ width: 28, height: 28 }} />}
            title="Không tải được số liệu kỷ niệm"
            description={anniversariesResult.message}
          />
        )}
      </SectionCard>
    </div>
  );
}

// ---------- UI helpers ----------
function NavPill({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition-colors hover:bg-white/20"
    >
      {icon}
      {label}
    </Link>
  );
}

function SectionCard({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem chi tiết <ArrowRight className="size-3" />
        </Link>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ---------- Section 1: Team Pulse ----------
function TeamPulseBlock({ data }: { data: TeamPulseResponse }) {
  const { overall, best, worst, kudosLeader } = data;
  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-gradient-to-br from-rose-50 to-pink-50 p-5 dark:from-rose-950/30 dark:to-pink-950/20">
        <HealthScore score={overall.pulse} size="lg" />
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            pulseLevelClass(overall.level),
          )}
        >
          {pulseLevelLabel(overall.level)}
        </span>
        <p className="text-xs text-muted-foreground">
          {overall.totalEmployees} nhân viên
        </p>
      </div>
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground">
          {overall.narrative}
        </p>
        <div className="flex flex-wrap gap-2">
          {best ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="size-3" />
              Tốt nhất: {roleLabel(best.role)} ({best.pulse}/100)
            </span>
          ) : null}
          {worst && (!best || worst.role !== best.role) ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="size-3" />
              Cần quan tâm: {roleLabel(worst.role)} ({worst.pulse}/100)
            </span>
          ) : null}
          {kudosLeader ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <Heart className="size-3" />
              Kudos leader: {kudosLeader.name} · {kudosLeader.count}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------- Section 2: Burnout ----------
function BurnoutBlock({ data }: { data: BurnoutResponse }) {
  const { summary, items } = data;
  const top3 = items.slice(0, 3);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KPIStat
          variant="accent"
          size="sm"
          label="Rủi ro cao"
          icon={<AlertTriangle className="size-4" />}
          value={<LiveCounter to={summary.high} />}
          hint="Cần can thiệp"
        />
        <KPIStat
          variant="default"
          size="sm"
          label="Rủi ro vừa"
          icon={<AlertTriangle className="size-4" />}
          value={<LiveCounter to={summary.medium} />}
          hint="Theo dõi sát"
        />
        <KPIStat
          variant="subtle"
          size="sm"
          label="Rủi ro thấp"
          icon={<CheckCircle2 className="size-4" />}
          value={<LiveCounter to={summary.low} />}
          hint="Ổn định"
        />
      </div>

      {top3.length > 0 ? (
        <div className="rounded-lg border border-border">
          <p className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top 3 nhân viên cần lưu ý
          </p>
          <ul className="divide-y divide-border">
            {top3.map((it, idx) => (
              <li
                key={it.employee.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                    idx === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : idx === 1
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                  )}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {it.employee.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {roleLabel(it.employee.role)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tabular-nums leading-none text-foreground">
                    {it.riskScore}
                  </span>
                  <RiskBadge level={it.riskLevel} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          variant="subtle"
          size="sm"
          title="Chưa có nhân viên rủi ro"
          description="Tất cả nhân viên đang trong vùng an toàn."
        />
      )}
    </div>
  );
}

// ---------- Section 3: Today snapshot ----------
function SnapshotBlock({ data }: { data: DashboardSnapshot }) {
  const { attendance, leaves, tasks, activity, topActiveToday } = data;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStat
          variant="default"
          size="sm"
          label="Check-in hôm nay"
          icon={<LogIn className="size-4" />}
          value={<LiveCounter to={attendance?.checkinsToday ?? 0} />}
          hint={
            attendance
              ? `Hôm qua: ${attendance.checkinsYesterday}`
              : "Chưa có dữ liệu"
          }
        />
        <KPIStat
          variant="default"
          size="sm"
          label="Đang nghỉ"
          icon={<Plane className="size-4" />}
          value={<LiveCounter to={leaves?.onLeaveToday ?? 0} />}
          hint={leaves ? "Đơn duyệt phủ hôm nay" : "Chưa có dữ liệu"}
        />
        <KPIStat
          variant="default"
          size="sm"
          label="Task mở"
          icon={<ListTodo className="size-4" />}
          value={<LiveCounter to={tasks?.open ?? 0} />}
          hint={tasks ? `${tasks.overdue} quá hạn` : "Chưa có dữ liệu"}
        />
        <KPIStat
          variant="default"
          size="sm"
          label="Kudos 7 ngày"
          icon={<Heart className="size-4" />}
          value={<LiveCounter to={activity?.kudosLast7d ?? 0} />}
          hint={
            activity ? `Tuần trước: ${activity.kudosPriorWeek}` : "Chưa có dữ liệu"
          }
        />
      </div>

      {topActiveToday && topActiveToday.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top hoạt động hôm nay
          </p>
          <div className="flex flex-wrap gap-2">
            {topActiveToday.map((emp, idx) => (
              <span
                key={emp.id}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                    idx === 0
                      ? "bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                      : idx === 1
                        ? "bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200"
                        : "bg-orange-200 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200",
                  )}
                >
                  {idx + 1}
                </span>
                <span className="font-medium text-foreground">{emp.name}</span>
                <span className="text-muted-foreground">
                  · {roleLabel(emp.role)} · {emp.checkinsToday} check-in
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          variant="subtle"
          size="sm"
          icon={<Users style={{ width: 28, height: 28 }} />}
          title="Chưa có hoạt động"
          description="Hôm nay chưa có nhân viên nào check-in."
        />
      )}
    </div>
  );
}

// ---------- Section 4: Anniversaries ----------
function AnniversariesBlock({ data }: { data: AnniversariesResponse }) {
  const next3 = data.items.slice(0, 3);
  if (next3.length === 0) {
    return (
      <EmptyState
        variant="subtle"
        size="sm"
        icon={<CalendarHeart style={{ width: 28, height: 28 }} />}
        title="Chưa có kỷ niệm sắp tới"
        description="Không có nhân viên nào sắp đến mốc kỷ niệm trong thời gian tới."
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1">
          <ClipboardList className="size-3" />
          {data.summary.upcomingCount} sắp đến
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1">
          <Sparkles className="size-3" />
          {data.summary.milestoneCount} mốc lớn
        </span>
      </div>
      <ul className="space-y-2">
        {next3.map((it) => (
          <li
            key={it.id}
            className={cn(
              "flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors",
              it.milestone
                ? "border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm shadow-amber-300/30 dark:from-amber-950/30 dark:to-orange-950/20"
                : "border-border bg-card",
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                it.milestone
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/40"
                  : "bg-primary/10 text-primary",
              )}
            >
              {it.milestone ? (
                <Trophy className="size-5" />
              ) : (
                <Gift className="size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {it.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel(it.role)} ·{" "}
                <span className="font-medium text-foreground">
                  {it.yearsCompleting} năm
                </span>{" "}
                · {it.badgeLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {formatDateVi(it.nextAnniversaryIso)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                còn {it.daysUntil} ngày
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
