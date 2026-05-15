import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coffee,
  Heart,
  Hourglass,
  ListTodo,
  LogIn,
  Plane,
  RefreshCw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { KPIStat } from "@/components/kpi-stat";
import { LiveCounter } from "@/components/live-counter";
import { TimeAgo } from "@/components/time-ago";
import { EmptyState } from "@/components/empty-state";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bảng điều khiển quản trị — Cafe HR",
};

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

type FetchResult =
  | { ok: true; data: DashboardSnapshot }
  | { ok: false; status: number; message: string };

async function fetchSnapshot(): Promise<FetchResult> {
  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    const cookie = h.get("cookie") ?? "";
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
    const res = await fetch(`${base}/api/dashboard/snapshot`, {
      cache: "no-store",
      headers: { cookie },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: `API trả về HTTP ${res.status}`,
      };
    }
    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      (data as { ok?: unknown }).ok !== true
    ) {
      return {
        ok: false,
        status: res.status,
        message: "Phản hồi snapshot không hợp lệ",
      };
    }
    return { ok: true, data: data as DashboardSnapshot };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, message };
  }
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

const SHIFT_META: Record<
  ShiftTypeKey,
  { label: string; Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  morning: {
    label: "Ca sáng",
    Icon: Sunrise,
    tone: "from-amber-200/40 to-orange-100/30 border-amber-300/40 text-amber-700 dark:text-amber-300",
  },
  afternoon: {
    label: "Ca chiều",
    Icon: Sun,
    tone: "from-sky-200/40 to-cyan-100/30 border-sky-300/40 text-sky-700 dark:text-sky-300",
  },
  evening: {
    label: "Ca tối",
    Icon: Sunset,
    tone: "from-indigo-200/40 to-violet-100/30 border-indigo-300/40 text-indigo-700 dark:text-indigo-300",
  },
};

const SECTION_LABELS: Record<string, string> = {
  employees: "Nhân viên",
  shifts: "Ca làm",
  attendance: "Chấm công",
  leaves: "Nghỉ phép",
  tasks: "Công việc",
  activity: "Hoạt động",
  topActiveToday: "Top hoạt động",
};

export default async function AdminDashboardV2Page() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const result = await fetchSnapshot();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Quản trị
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Bảng điều khiển quản trị
          </h1>
        </header>
        <EmptyState
          variant="card"
          size="lg"
          icon={<AlertTriangle style={{ width: 36, height: 36 }} />}
          title="Không tải được số liệu"
          description={`Hệ thống không thể lấy snapshot dashboard (${result.message}). Vui lòng thử lại sau giây lát.`}
          action={
            <a
              href=""
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="size-4" /> Thử lại
            </a>
          }
        />
      </div>
    );
  }

  const snap = result.data;
  const {
    employees,
    shifts,
    attendance,
    leaves,
    tasks,
    activity,
    topActiveToday,
    errors,
  } = snap;

  const kudosLast7d = activity?.kudosLast7d ?? 0;
  const kudosPrior = activity?.kudosPriorWeek ?? 0;
  const kudosDelta = kudosLast7d - kudosPrior;

  return (
    <div className="space-y-8">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/30 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-1 rounded-full border bg-card/70 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
              <Sparkles className="size-3" /> Quản trị · v2
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Bảng điều khiển quản trị
            </h1>
            <p className="text-sm text-muted-foreground">
              Cập nhật{" "}
              <TimeAgo iso={snap.generatedAt} withPrefix /> · Ngày{" "}
              <span className="font-medium text-foreground">{snap.date}</span>
            </p>
          </div>
          <a
            href="?refresh=1"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <RefreshCw className="size-4" /> Làm mới
          </a>
        </div>
      </section>

      {/* Errors banner */}
      {errors && Object.keys(errors).length > 0 ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/70 p-4 dark:border-amber-700/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                Một số mục không tải được
              </p>
              <p className="mt-0.5 text-sm text-amber-800/90 dark:text-amber-200/80">
                Các mục sau gặp lỗi và đã được bỏ qua:{" "}
                {Object.keys(errors)
                  .map((k) => SECTION_LABELS[k] ?? k)
                  .join(", ")}
                .
              </p>
              <div className="mt-3">
                <EmptyState
                  variant="subtle"
                  size="sm"
                  title="Chi tiết lỗi"
                  description={Object.entries(errors)
                    .map(
                      ([k, v]) => `${SECTION_LABELS[k] ?? k}: ${v}`,
                    )
                    .join(" • ")}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Row 1: Headline KPIs — accent */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStat
          variant="accent"
          label="Tổng nhân viên"
          icon={<Users className="size-4" />}
          value={<LiveCounter to={employees?.total ?? 0} />}
          hint={
            employees
              ? `${employees.activeToday} đang hoạt động hôm nay`
              : "Chưa có dữ liệu"
          }
        />
        <KPIStat
          variant="accent"
          label="Đang làm hôm nay"
          icon={<UserRound className="size-4" />}
          value={<LiveCounter to={employees?.activeToday ?? 0} />}
          hint={
            employees && employees.total > 0
              ? `${pct(employees.activeToday, employees.total)}% lực lượng`
              : undefined
          }
        />
        <KPIStat
          variant="accent"
          label="Ca hôm nay"
          icon={<CalendarClock className="size-4" />}
          value={<LiveCounter to={shifts?.today ?? 0} />}
          hint={
            shifts
              ? `${shifts.byType.morning} sáng · ${shifts.byType.afternoon} chiều · ${shifts.byType.evening} tối`
              : undefined
          }
        />
        <KPIStat
          variant="accent"
          label="Check-in hôm nay"
          icon={<LogIn className="size-4" />}
          value={<LiveCounter to={attendance?.checkinsToday ?? 0} />}
          hint={
            attendance
              ? `Hôm qua: ${attendance.checkinsYesterday}`
              : undefined
          }
          trend={
            attendance
              ? {
                  delta: attendance.deltaPct,
                  deltaLabel: `${attendance.deltaPct > 0 ? "+" : ""}${attendance.deltaPct}%`,
                  period: "so với hôm qua",
                }
              : undefined
          }
        />
      </section>

      {/* Row 2: Operational KPIs — default */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStat
          variant="default"
          label="Giờ làm trung bình"
          icon={<Hourglass className="size-4" />}
          value={
            <LiveCounter
              to={attendance?.avgHoursToday ?? 0}
              decimals={2}
            />
          }
          hint={
            attendance
              ? `Trung bình mỗi ca đã check-out (${attendance.checkoutsToday} ca)`
              : undefined
          }
        />
        <KPIStat
          variant="default"
          label="Đơn nghỉ chờ duyệt"
          icon={<Clock className="size-4" />}
          value={<LiveCounter to={leaves?.pending ?? 0} />}
          hint={leaves ? "Cần xem xét sớm" : undefined}
          href="/leave"
        />
        <KPIStat
          variant="default"
          label="Đang nghỉ hôm nay"
          icon={<Plane className="size-4" />}
          value={<LiveCounter to={leaves?.onLeaveToday ?? 0} />}
          hint={leaves ? "Đơn đã duyệt phủ ngày hôm nay" : undefined}
        />
        <KPIStat
          variant="default"
          label="Sắp nghỉ"
          icon={<CalendarClock className="size-4" />}
          value={<LiveCounter to={leaves?.approvedFuture ?? 0} />}
          hint={leaves ? "Đơn duyệt cho các ngày tới" : undefined}
        />
      </section>

      {/* Row 3: Tasks & activity — subtle */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStat
          variant="subtle"
          label="Task mở"
          icon={<ListTodo className="size-4" />}
          value={<LiveCounter to={tasks?.open ?? 0} />}
          hint={tasks ? "Chưa hoàn thành" : undefined}
          href="/tasks"
        />
        <KPIStat
          variant="subtle"
          label="Quá hạn"
          icon={<AlertCircle className="size-4" />}
          value={<LiveCounter to={tasks?.overdue ?? 0} />}
          hint={tasks ? "Đã qua hạn mà chưa xong" : undefined}
          trend={
            tasks
              ? {
                  delta: tasks.overdue,
                  deltaLabel:
                    tasks.overdue === 0
                      ? "Sạch"
                      : `${tasks.overdue} cần xử lý`,
                  direction: "down-is-good",
                  period: "trạng thái hiện tại",
                }
              : undefined
          }
        />
        <KPIStat
          variant="subtle"
          label="Hoàn thành hôm nay"
          icon={<CheckCircle2 className="size-4" />}
          value={<LiveCounter to={tasks?.completedToday ?? 0} />}
          hint={tasks ? "Task đóng trong hôm nay" : undefined}
        />
        <KPIStat
          variant="subtle"
          label="Hoạt động 24h"
          icon={<TrendingUp className="size-4" />}
          value={<LiveCounter to={activity?.last24h ?? 0} />}
          hint={activity ? "Bản ghi audit log" : undefined}
          href="/audit"
        />
      </section>

      {/* Shift mix today */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Cơ cấu ca hôm nay
          </h2>
          {shifts ? (
            <p className="text-xs text-muted-foreground">
              Tổng {shifts.today} ca
            </p>
          ) : null}
        </div>
        {shifts ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(SHIFT_META) as ShiftTypeKey[]).map((key) => {
              const meta = SHIFT_META[key];
              const count = shifts.byType[key];
              const percent = pct(count, shifts.today);
              const Icon = meta.Icon;
              return (
                <div
                  key={key}
                  className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 ${meta.tone}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-full bg-background/70 shadow-sm">
                        <Icon className="size-4" />
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {meta.label}
                      </p>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {percent}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums text-foreground">
                      <LiveCounter to={count} />
                    </span>
                    <span className="text-xs text-muted-foreground">ca</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                    <div
                      className="h-full rounded-full bg-foreground/40"
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            variant="default"
            size="sm"
            title="Chưa có dữ liệu ca"
            description="Không lấy được thông tin ca làm cho hôm nay."
          />
        )}
      </section>

      {/* Kudos momentum & Top active */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Đà kudos
          </h2>
          <KPIStat
            variant="elevated"
            label="Kudos 7 ngày gần nhất"
            icon={<Heart className="size-4" />}
            value={<LiveCounter to={kudosLast7d} />}
            hint={`Tuần trước: ${kudosPrior} lời cảm ơn`}
            sparklineValues={[kudosPrior, kudosLast7d]}
            trend={{
              delta: kudosDelta,
              deltaLabel:
                kudosDelta === 0
                  ? "0"
                  : `${kudosDelta > 0 ? "+" : ""}${kudosDelta}`,
              period: "so với tuần trước",
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Top hoạt động hôm nay
          </h2>
          <div className="rounded-lg border border-border bg-card">
            {topActiveToday && topActiveToday.length > 0 ? (
              <ul className="divide-y divide-border">
                {topActiveToday.map((emp, idx) => (
                  <li
                    key={emp.id}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                        idx === 0
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : idx === 1
                            ? "bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Coffee className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {emp.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        ID #{emp.id}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Building2 className="size-3" />
                      {roleLabel(emp.role)}
                    </span>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums leading-none text-foreground">
                        <LiveCounter to={emp.checkinsToday} />
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        check-in
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                variant="subtle"
                size="md"
                icon={<UserRound style={{ width: 32, height: 32 }} />}
                title="Chưa có hoạt động"
                description="Hôm nay chưa có nhân viên nào check-in."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
