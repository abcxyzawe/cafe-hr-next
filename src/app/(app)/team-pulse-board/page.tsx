import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarOff,
  CheckCircle2,
  Clock,
  Heart,
  Moon,
  ServerCrash,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserX,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { HealthScore, StatusDot } from "@/components/risk-indicators";
import { LiveCounter } from "@/components/live-counter";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RoleKey = "barista" | "server" | "cashier" | "manager";
type PulseLevel = "low" | "medium" | "high";

type RoleEntry = {
  role: RoleKey;
  headcount: number;
  activeToday: number;
  avgHoursPerEmployeeLast30: number;
  expectedHoursPerEmployee: number;
  kudosLast30: number;
  tasksCompletedLast30: number;
  tasksOverdueOpen: number;
  approvedLeavesLast30: number;
  lateCheckoutCount30: number;
  scheduledShifts30: number;
  noShows30: number;
  pulseScore: number;
  pulseLevel: PulseLevel;
  pulsePrev: number | null;
  pulseDelta: number | null;
  narrative: string;
};

type KudosLeader = {
  id: number;
  name: string;
  role: RoleKey;
  count: number;
};

type OverallSummary = {
  pulse: number;
  pulsePrev: number | null;
  pulseDelta: number | null;
  level: PulseLevel;
  totalEmployees: number;
  narrative: string;
};

type BestWorst = {
  role: RoleKey;
  pulse: number;
};

type TeamPulseResponse = {
  ok: true;
  generatedAt: string;
  windowDays: 30;
  overall: OverallSummary;
  best: BestWorst | null;
  worst: BestWorst | null;
  kudosLeader: KudosLeader | null;
  roles: RoleEntry[];
};

type FetchResult =
  | { ok: true; data: TeamPulseResponse }
  | { ok: false; error: string };

async function fetchTeamPulse(): Promise<FetchResult> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    const cookie = h.get("cookie") ?? "";
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
    const res = await fetch(`${base}/api/team-pulse`, {
      cache: "no-store",
      headers: { cookie },
    });
    if (!res.ok) {
      return { ok: false, error: `API vận hành trả về HTTP ${res.status}` };
    }
    const raw: unknown = await res.json();
    if (
      !raw ||
      typeof raw !== "object" ||
      (raw as { ok?: unknown }).ok !== true
    ) {
      return { ok: false, error: "Phản hồi không hợp lệ" };
    }
    return { ok: true, data: raw as TeamPulseResponse };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

function roleLabelVi(role: RoleKey): string {
  switch (role) {
    case "barista":
      return "Pha chế";
    case "server":
      return "Phục vụ";
    case "cashier":
      return "Thu ngân";
    case "manager":
      return "Quản lý";
  }
}

function levelLabelVi(level: PulseLevel): string {
  if (level === "high") return "Vận hành tốt";
  if (level === "medium") return "Ổn định";
  return "Cần can thiệp";
}

function levelPillClass(level: PulseLevel): string {
  if (level === "high") {
    return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (level === "medium") {
    return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
}

function statusDotLevel(level: PulseLevel): "low" | "medium" | "high" {
  // StatusDot semantics: low=green, high=red. Pulse is opposite. Invert.
  if (level === "high") return "low";
  if (level === "low") return "high";
  return "medium";
}

function pulseBarColorClass(level: PulseLevel): string {
  if (level === "high") return "bg-emerald-500";
  if (level === "medium") return "bg-amber-500";
  return "bg-red-500";
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TrendBadge({
  delta,
}: {
  delta: number | null;
}): React.ReactElement | null {
  if (delta == null) return null;
  const abs = Math.abs(delta);
  if (abs < 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/20 bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        <ArrowRight className="size-3" />
        ổn định
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        up
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
      )}
      title="So với 30 ngày trước"
    >
      {up ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {up ? "+" : "−"}
      {abs}
    </span>
  );
}

function PulseBar({
  score,
  level,
}: {
  score: number;
  level: PulseLevel;
}): React.ReactElement {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums text-foreground">
          {Math.round(pct)} / 100
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            levelPillClass(level),
          )}
        >
          <StatusDot level={statusDotLevel(level)} size="sm" />
          {levelLabelVi(level)}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Điểm vận hành"
      >
        <div
          className={cn("h-full transition-all", pulseBarColorClass(level))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type RoleStatProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  decimals?: number;
  emphasis?: "default" | "good" | "warn" | "bad";
};

function RoleStat({
  icon: Icon,
  label,
  value,
  decimals = 0,
  emphasis = "default",
}: RoleStatProps): React.ReactElement {
  const tone =
    emphasis === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : emphasis === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : emphasis === "bad"
          ? "text-red-600 dark:text-red-400"
          : "text-foreground";
  return (
    <div className="rounded-md border border-border/70 bg-muted/30 p-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn("mt-0.5 text-base font-bold leading-tight tabular-nums", tone)}
      >
        <LiveCounter to={value} duration={700} decimals={decimals} />
      </div>
    </div>
  );
}

function RoleCard({ entry }: { entry: RoleEntry }): React.ReactElement {
  const activeRatio =
    entry.headcount > 0
      ? Math.round((entry.activeToday / entry.headcount) * 100)
      : 0;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight text-foreground">
            {roleLabelVi(entry.role)}
          </h3>
          <p className="text-xs text-muted-foreground">
            Vai trò trong đội ngũ
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <HealthScore score={entry.pulseScore} size="md" />
          <TrendBadge delta={entry.pulseDelta} />
        </div>
      </header>

      <div className="flex items-end justify-between rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 px-3 py-2 dark:from-sky-950/30 dark:to-cyan-950/30">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Tổng nhân sự
          </p>
          <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
            <LiveCounter to={entry.headcount} duration={700} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Đi làm hôm nay
          </p>
          <p className="text-sm font-semibold text-foreground">
            <span className="tabular-nums">
              {entry.activeToday} / {entry.headcount}
            </span>{" "}
            <span className="text-xs text-muted-foreground">
              ({activeRatio}%)
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border/70 bg-muted/30 p-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3" aria-hidden />
            <span className="truncate">Giờ TB / kỳ vọng</span>
          </div>
          <div className="mt-0.5 text-base font-bold leading-tight tabular-nums text-foreground">
            {entry.avgHoursPerEmployeeLast30}
            <span className="text-xs font-medium text-muted-foreground">
              /{entry.expectedHoursPerEmployee}h
            </span>
          </div>
        </div>
        <RoleStat
          icon={Heart}
          label="Kudos"
          value={entry.kudosLast30}
          emphasis={entry.kudosLast30 > 0 ? "good" : "default"}
        />
        <RoleStat
          icon={CheckCircle2}
          label="Task xong"
          value={entry.tasksCompletedLast30}
          emphasis="good"
        />
        <RoleStat
          icon={AlertTriangle}
          label="Task quá hạn"
          value={entry.tasksOverdueOpen}
          emphasis={entry.tasksOverdueOpen > 0 ? "bad" : "default"}
        />
        <div className="rounded-md border border-border/70 bg-muted/30 p-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <UserX className="size-3" aria-hidden />
            <span className="truncate">No-show</span>
          </div>
          <div
            className={cn(
              "mt-0.5 text-base font-bold leading-tight tabular-nums",
              entry.noShows30 > 0
                ? "text-red-600 dark:text-red-400"
                : "text-foreground",
            )}
          >
            {entry.noShows30}
            <span className="text-xs font-medium text-muted-foreground">
              /{entry.scheduledShifts30}
            </span>
          </div>
        </div>
        <RoleStat
          icon={Moon}
          label="Tan ca muộn"
          value={entry.lateCheckoutCount30}
          emphasis={entry.lateCheckoutCount30 > 0 ? "warn" : "default"}
        />
      </div>

      {entry.approvedLeavesLast30 > 0 ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarOff className="size-3" aria-hidden />
          {entry.approvedLeavesLast30} ngày nghỉ đã duyệt trong 30 ngày
        </p>
      ) : null}

      <PulseBar score={entry.pulseScore} level={entry.pulseLevel} />

      <p className="text-xs italic leading-relaxed text-muted-foreground">
        {entry.narrative}
      </p>
    </article>
  );
}

export const metadata = {
  title: "Khả năng vận hành đội ngũ — Cafe HR",
};

export default async function TeamPulseBoardPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");

  const result = await fetchTeamPulse();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <header className="rounded-2xl border bg-gradient-to-br from-cyan-100 via-background to-sky-100/70 p-6 dark:from-cyan-950/30 dark:via-background dark:to-sky-950/20 md:p-8">
          <div className="flex items-center gap-3">
            <Activity className="size-6 text-cyan-600 dark:text-cyan-300" />
            <h1 className="text-3xl font-bold tracking-tight">
              Khả năng vận hành đội ngũ
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Cửa sổ phân tích: 30 ngày gần nhất
          </p>
        </header>
        <EmptyState
          icon={<ServerCrash style={{ width: 36, height: 36 }} />}
          title="Không tải được dữ liệu vận hành"
          description={result.error}
          variant="card"
          size="lg"
        />
      </div>
    );
  }

  const { data } = result;
  const { overall, best, worst, kudosLeader, roles, generatedAt, windowDays } =
    data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-cyan-100 via-background to-sky-100/70 p-6 dark:from-cyan-950/30 dark:via-background dark:to-sky-950/20 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <Activity className="size-3.5 text-cyan-600 dark:text-cyan-300" />
              Bảng điểm vận hành
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Khả năng vận hành đội ngũ
            </h1>
            <p className="text-sm text-muted-foreground">
              Cửa sổ phân tích: {windowDays} ngày gần nhất · Cập nhật{" "}
              {formatGeneratedAt(generatedAt)}
            </p>
          </div>
        </div>
      </section>

      {/* Hero overall pulse */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <HealthScore score={overall.pulse} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                Điểm vận hành toàn đội
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  levelPillClass(overall.level),
                )}
              >
                <StatusDot
                  level={statusDotLevel(overall.level)}
                  size="sm"
                  pulse
                />
                {levelLabelVi(overall.level)}
              </span>
              <TrendBadge delta={overall.pulseDelta} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {overall.narrative}
            </p>
          </div>
        </div>
      </section>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-lg border bg-card p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Tổng nhân viên
            </p>
            <p className="truncate text-2xl font-bold leading-tight tabular-nums">
              <LiveCounter to={overall.totalEmployees} duration={800} />
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Toàn bộ vai trò
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border bg-card p-5">
          <HealthScore score={overall.pulse} size="md" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Điểm vận hành
            </p>
            <p className="truncate text-2xl font-bold leading-tight tabular-nums">
              {overall.pulse}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                / 100
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {levelLabelVi(overall.level)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border bg-card p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Nhóm tốt nhất
            </p>
            <p className="truncate text-lg font-bold leading-tight">
              {best ? roleLabelVi(best.role) : "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground tabular-nums">
              {best ? `Điểm ${best.pulse}/100` : "Chưa có dữ liệu"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border bg-card p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <TrendingDown className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Nhóm cần chú ý
            </p>
            <p className="truncate text-lg font-bold leading-tight">
              {worst ? roleLabelVi(worst.role) : "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground tabular-nums">
              {worst ? `Điểm ${worst.pulse}/100` : "Chưa có dữ liệu"}
            </p>
          </div>
        </div>
      </section>

      {/* Kudos leader spotlight */}
      {kudosLeader ? (
        <section className="relative overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 p-6 shadow-sm dark:from-amber-950/40 dark:via-amber-950/20 dark:to-orange-950/40">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30">
              <Trophy className="size-10" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <Sparkles className="size-3" aria-hidden />
                Quán quân Kudos 30 ngày
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-2xl font-bold leading-tight text-foreground">
                  {kudosLeader.name}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-white/80 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  {roleLabelVi(kudosLeader.role)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Là người nhận được nhiều lời khen nhất trong 30 ngày gần đây.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Lời khen
              </p>
              <p className="text-5xl font-bold leading-none tabular-nums text-amber-700 dark:text-amber-300">
                <LiveCounter to={kudosLeader.count} duration={1000} />
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Award className="size-3.5 text-amber-600" aria-hidden />
                kudos nhận được
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Roles grid */}
      {roles.length === 0 ? (
        <EmptyState
          icon={<Users style={{ width: 36, height: 36 }} />}
          title="Chưa có dữ liệu vai trò"
          description="Hệ thống chưa ghi nhận nhóm nhân viên nào để tính điểm vận hành."
          variant="card"
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {roles.map((entry) => (
            <RoleCard key={entry.role} entry={entry} />
          ))}
        </section>
      )}
    </div>
  );
}
