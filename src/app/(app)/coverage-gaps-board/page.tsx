import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarX,
  Lightbulb,
  Moon,
  Sun,
  Sunset,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveCounter } from "@/components/live-counter";
import { TimeAgo } from "@/components/time-ago";
import { EmptyState } from "@/components/empty-state";
import { EmployeeAvatarStack } from "@/components/employee-avatar";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lỗ hổng phân ca — Cafe HR",
};

type SlotKey = "morning" | "afternoon" | "evening";
type Severity = "ok" | "low" | "high";

type EmployeeRef = { id: number; name: string; role: string };

type SlotInfo = {
  assigned: number;
  onLeave: number;
  effective: number;
  shortage: number;
  severity: Severity;
  employees: EmployeeRef[];
};

type DayInfo = {
  iso: string;
  weekday: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  slots: { morning: SlotInfo; afternoon: SlotInfo; evening: SlotInfo };
  unspecifiedAssigned: number;
  dayShortageTotal: number;
  severityWorst: Severity;
};

type Summary = {
  totalShortage: number;
  daysWithGap: number;
  worstDay: { iso: string; shortage: number } | null;
  byShiftType: { morning: number; afternoon: number; evening: number };
  recommendation: string;
};

type CoverageGapsResponse = {
  ok: true;
  generatedAt: string;
  windowDays: number;
  minPerSlot: number;
  summary: Summary;
  days: DayInfo[];
};

type SearchParams = { days?: string; minPerSlot?: string };

const DAY_OPTIONS = [7, 14, 21, 30, 45, 60] as const;
const MIN_PER_SLOT_OPTIONS = [1, 2, 3, 4, 5] as const;

function parseDays(raw: string | undefined): number {
  if (!raw) return 14;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 14;
  if (n < 7) return 7;
  if (n > 60) return 60;
  return n;
}

function parseMinPerSlot(raw: string | undefined): number {
  if (!raw) return 2;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 2;
  if (n < 1) return 1;
  if (n > 10) return 10;
  return n;
}

function formatIsoShort(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

const SLOT_META: Record<
  SlotKey,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  morning: { label: "Sáng", icon: Sun },
  afternoon: { label: "Chiều", icon: Sunset },
  evening: { label: "Tối", icon: Moon },
};

const SEVERITY_CARD: Record<Severity, string> = {
  ok: "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
  low: "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
  high: "border-red-400 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
};

const SEVERITY_BADGE: Record<Severity, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  low: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
  high: "bg-red-500/20 text-red-800 dark:text-red-300",
};

const SEVERITY_ICON: Record<Severity, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  low: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

const DAY_ROW_BORDER: Record<Severity, string> = {
  ok: "border-l-emerald-400",
  low: "border-l-amber-400",
  high: "border-l-red-500",
};

async function fetchCoverageGaps(
  days: number,
  minPerSlot: number,
): Promise<CoverageGapsResponse> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  const res = await fetch(
    `${base}/api/shifts/coverage-gaps?days=${days}&minPerSlot=${minPerSlot}`,
    {
      cache: "no-store",
      headers: { cookie },
    },
  );
  if (!res.ok) {
    throw new Error(`Coverage gaps API trả về HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Phản hồi coverage-gaps không hợp lệ");
  }
  return data as CoverageGapsResponse;
}

export default async function CoverageGapsBoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const days = parseDays(sp.days);
  const minPerSlot = parseMinPerSlot(sp.minPerSlot);

  let data: CoverageGapsResponse | null = null;
  let fetchError: string | null = null;
  try {
    data = await fetchCoverageGaps(days, minPerSlot);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <HeaderCard
          windowDays={days}
          minPerSlot={minPerSlot}
          generatedAt={null}
        />
        <EmptyState
          icon={<AlertTriangle style={{ width: 36, height: 36 }} />}
          title="Không thể tải dữ liệu phân ca"
          description={
            fetchError ??
            "Đã xảy ra lỗi khi truy vấn API. Vui lòng thử lại sau."
          }
          variant="card"
          size="lg"
        />
      </div>
    );
  }

  const { summary, days: dayInfos } = data;
  const worstDayLabel = summary.worstDay
    ? `${formatIsoShort(summary.worstDay.iso)} (thiếu ${summary.worstDay.shortage})`
    : "—";

  const recommendationSeverity: Severity =
    summary.totalShortage === 0
      ? "ok"
      : summary.worstDay && summary.worstDay.shortage >= 2
        ? "high"
        : "low";

  return (
    <div className="space-y-6">
      <HeaderCard
        windowDays={data.windowDays}
        minPerSlot={data.minPerSlot}
        generatedAt={data.generatedAt}
      />

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <ControlGroup
            label="Khoảng thời gian"
            current={data.windowDays}
            options={DAY_OPTIONS}
            paramKey="days"
            otherKey="minPerSlot"
            otherValue={data.minPerSlot}
            suffix="ngày"
          />
          <ControlGroup
            label="Số nhân viên tối thiểu / ca"
            current={data.minPerSlot}
            options={MIN_PER_SLOT_OPTIONS}
            paramKey="minPerSlot"
            otherKey="days"
            otherValue={data.windowDays}
            suffix="người"
          />
        </CardContent>
      </Card>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<TrendingDown className="size-5" />}
          label="Thiếu hụt tổng"
          value={<LiveCounter to={summary.totalShortage} duration={800} />}
          sublabel={`Suất nhân sự thiếu trong ${data.windowDays} ngày`}
          tone={summary.totalShortage === 0 ? "primary" : "accent"}
        />
        <KpiCard
          icon={<CalendarX className="size-5" />}
          label="Ngày có gap"
          value={<LiveCounter to={summary.daysWithGap} duration={800} />}
          sublabel={`/ ${data.windowDays} ngày khảo sát`}
          tone="secondary"
        />
        <KpiCard
          icon={<AlertTriangle className="size-5" />}
          label="Ngày tệ nhất"
          value={
            <span className="text-2xl font-bold tabular-nums">
              {worstDayLabel}
            </span>
          }
          sublabel={
            summary.worstDay
              ? `Tổng ${summary.worstDay.shortage} suất thiếu`
              : "Không có ngày thiếu"
          }
          tone={summary.worstDay ? "accent" : "primary"}
        />
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl",
                recommendationSeverity === "ok"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : recommendationSeverity === "low"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
              )}
            >
              <Lightbulb className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Khuyến nghị
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
                  recommendationSeverity === "ok"
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                    : recommendationSeverity === "low"
                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                      : "bg-red-500/20 text-red-900 dark:text-red-200",
                )}
              >
                <span className="line-clamp-3">{summary.recommendation}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* By shift type */}
      <section className="grid gap-4 sm:grid-cols-3">
        {(["morning", "afternoon", "evening"] as SlotKey[]).map((k) => {
          const meta = SLOT_META[k];
          const count = summary.byShiftType[k];
          const Icon = meta.icon;
          return (
            <Card key={k}>
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                    k === "morning"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      : k === "afternoon"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ca {meta.label}
                  </p>
                  <p className="text-2xl font-bold leading-tight tabular-nums">
                    <LiveCounter to={count} duration={700} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    suất đã phân ca
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Per-day grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-orange-500" /> Chi tiết theo
            ngày
          </CardTitle>
          <CardDescription>
            Mỗi hàng là một ngày trong cửa sổ {data.windowDays} ngày. Ô màu thể
            hiện mức độ thiếu nhân sự cho từng ca so với mức tối thiểu{" "}
            {data.minPerSlot} người.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dayInfos.length === 0 ? (
            <EmptyState
              icon={<CalendarX style={{ width: 36, height: 36 }} />}
              title="Không có dữ liệu phân ca"
              description="Chưa có lịch ca nào trong khoảng thời gian này."
              variant="subtle"
              size="md"
            />
          ) : (
            <ul className="space-y-3">
              {dayInfos.map((day) => (
                <li
                  key={day.iso}
                  className={cn(
                    "rounded-xl border border-l-4 bg-card p-4 shadow-sm",
                    DAY_ROW_BORDER[day.severityWorst],
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                    {/* Date pill */}
                    <div className="flex shrink-0 flex-col items-start gap-2 lg:w-44">
                      <div
                        className={cn(
                          "inline-flex items-baseline gap-2 rounded-lg border bg-background px-3 py-2",
                          day.isHoliday &&
                            "border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30",
                          !day.isHoliday &&
                            day.isWeekend &&
                            "border-sky-300 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/30",
                        )}
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {day.weekday}
                        </span>
                        <span className="text-lg font-bold tabular-nums">
                          {formatIsoShort(day.iso)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {day.isHoliday ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-rose-300 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            Lễ{day.holidayName ? `: ${day.holidayName}` : ""}
                          </Badge>
                        ) : null}
                        {day.isWeekend && !day.isHoliday ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-sky-300 bg-sky-50 text-[10px] text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
                          >
                            Cuối tuần
                          </Badge>
                        ) : null}
                        {day.dayShortageTotal > 0 ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-[10px]",
                              SEVERITY_BADGE[day.severityWorst],
                            )}
                          >
                            Thiếu {day.dayShortageTotal}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {/* Slot mini-cards */}
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      {(["morning", "afternoon", "evening"] as SlotKey[]).map(
                        (k) => {
                          const meta = SLOT_META[k];
                          const slot = day.slots[k];
                          const Icon = meta.icon;
                          return (
                            <div
                              key={k}
                              className={cn(
                                "flex flex-col gap-2 rounded-lg border p-3",
                                SEVERITY_CARD[slot.severity],
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                                  <Icon
                                    className={cn(
                                      "size-3.5",
                                      SEVERITY_ICON[slot.severity],
                                    )}
                                    aria-hidden
                                  />
                                  Ca {meta.label}
                                </span>
                                {slot.shortage > 0 ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                                      SEVERITY_BADGE[slot.severity],
                                    )}
                                  >
                                    thiếu {slot.shortage}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                    đủ
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-foreground/80 tabular-nums">
                                <span className="font-semibold">
                                  {slot.assigned}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  − {slot.onLeave} ={" "}
                                </span>
                                <span className="font-semibold">
                                  {slot.effective}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  / {data.minPerSlot}
                                </span>
                              </div>
                              {slot.employees.length > 0 ? (
                                <EmployeeAvatarStack
                                  employees={slot.employees.map((e) => ({
                                    id: e.id,
                                    name: e.name,
                                    role: e.role,
                                  }))}
                                  size="xs"
                                  max={4}
                                />
                              ) : (
                                <span className="text-[11px] italic text-muted-foreground">
                                  Chưa có ai
                                </span>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>

                    {/* Unspecified */}
                    {day.unspecifiedAssigned > 0 ? (
                      <div className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-3 py-2 text-center lg:w-28">
                        <Users
                          className="size-4 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="mt-1 text-lg font-bold tabular-nums">
                          {day.unspecifiedAssigned}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          ca chưa rõ
                        </span>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderCard({
  windowDays,
  minPerSlot,
  generatedAt,
}: {
  windowDays: number;
  minPerSlot: number;
  generatedAt: string | null;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-orange-200 via-orange-300 to-red-300 p-6 dark:from-orange-950/50 dark:via-rose-950/40 dark:to-red-950/40 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit gap-1 bg-background/70">
            <AlertTriangle className="size-3" /> Bảng điều khiển quản trị
          </Badge>
          <h1 className="flex items-center gap-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            <AlertTriangle
              className="size-8 text-red-600 dark:text-red-400"
              aria-hidden
            />
            Lỗ hổng phân ca
          </h1>
          <p className="max-w-xl text-sm text-foreground/80">
            Phân tích lịch ca {windowDays} ngày tới để phát hiện các khe thời
            gian thiếu nhân sự (dưới {minPerSlot} người/ca sau khi trừ nghỉ
            phép).
          </p>
          {generatedAt ? (
            <p className="text-xs text-foreground/70">
              Cập nhật <TimeAgo iso={generatedAt} withPrefix />
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ControlGroup<T extends number>({
  label,
  current,
  options,
  paramKey,
  otherKey,
  otherValue,
  suffix,
}: {
  label: string;
  current: number;
  options: readonly T[];
  paramKey: "days" | "minPerSlot";
  otherKey: "days" | "minPerSlot";
  otherValue: number;
  suffix: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = opt === current;
          const href = `/coverage-gaps-board?${paramKey}=${opt}&${otherKey}=${otherValue}`;
          return (
            <Link
              key={opt}
              href={href}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-accent",
              )}
            >
              {opt} {suffix}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
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
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-2xl font-bold leading-tight tabular-nums">
            {value}
          </p>
          {sublabel ? (
            <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
