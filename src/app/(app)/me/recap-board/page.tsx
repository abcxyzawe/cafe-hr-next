import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  Link2,
  Plane,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
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
import { KPIStat } from "@/components/kpi-stat";
import { EmptyState } from "@/components/empty-state";
import { LiveCounter } from "@/components/live-counter";
import { TimeAgo } from "@/components/time-ago";
import {
  TimelineCard,
  type TimelineEntry,
  type TimelineTone,
} from "@/components/timeline-card";
import { HealthScore } from "@/components/risk-indicators";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RecapHighlightCode =
  | "first_shift"
  | "long_day"
  | "kudos_received"
  | "task_completed"
  | "leave_taken"
  | "perfect_attendance"
  | "milestone_streak";

type RecapHighlight = {
  code: RecapHighlightCode;
  label: string;
  detail: string;
};

type DayBlock = {
  iso: string;
  weekday: string;
  hoursWorked: number;
  checkinTime: string | null;
  checkoutTime: string | null;
  tasksCompleted: number;
  kudosReceived: number;
  onLeave: boolean;
};

type RecapResponse = {
  ok: true;
  asOf: string;
  windowStartIso: string;
  windowEndIso: string;
  employee: { id: number; name: string; role: string } | null;
  totals: {
    hoursWorked: number;
    daysWorked: number;
    avgHoursPerWorkedDay: number;
    tasksCompleted: number;
    kudosReceived: number;
    onLeaveDays: number;
    onTimeRate: number;
  };
  bestDay: DayBlock | null;
  highlights: RecapHighlight[];
  days: DayBlock[];
  nextWeekShifts: number;
  comparisons: {
    hoursVsPriorWeek: number;
    kudosVsPriorWeek: number;
    tasksVsPriorWeek: number;
  };
};

async function fetchRecap(): Promise<RecapResponse> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  const res = await fetch(`${base}/api/me/recap`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) {
    throw new Error(`Recap API trả về HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Phản hồi recap không hợp lệ");
  }
  return data as RecapResponse;
}

function isoToDDMM(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function formatIsoRange(startIso: string, endIso: string): string {
  return `${isoToDDMM(startIso)} → ${isoToDDMM(endIso)}`;
}

const HIGHLIGHT_TONE: Record<RecapHighlightCode, TimelineTone> = {
  perfect_attendance: "success",
  long_day: "primary",
  kudos_received: "warning",
  task_completed: "info",
  leave_taken: "muted",
  first_shift: "info",
  milestone_streak: "success",
};

function highlightIcon(code: RecapHighlightCode): React.ReactElement {
  switch (code) {
    case "perfect_attendance":
      return <Calendar className="size-4" aria-hidden />;
    case "long_day":
      return <Trophy className="size-4" aria-hidden />;
    case "kudos_received":
      return <Heart className="size-4" aria-hidden />;
    case "task_completed":
      return <CheckCircle2 className="size-4" aria-hidden />;
    case "leave_taken":
      return <Plane className="size-4" aria-hidden />;
    case "first_shift":
      return <Sunrise className="size-4" aria-hidden />;
    case "milestone_streak":
      return <Star className="size-4" aria-hidden />;
  }
}

export const metadata = {
  title: "Tóm tắt 7 ngày — Cafe HR",
};

export default async function RecapBoardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await fetchRecap();

  if (!data.employee) {
    return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 p-6 text-white shadow-md md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="w-fit gap-1 border-white/40 bg-white/10 text-white"
              >
                <Sparkles className="size-3" /> Tóm tắt tuần
              </Badge>
              <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                Tóm tắt 7 ngày của bạn
              </h1>
              <p className="text-sm text-white/90">
                Nhật ký công việc tuần qua — giờ làm, task, kudos và phong độ
                tổng thể.
              </p>
            </div>
          </div>
        </section>

        <EmptyState
          icon={<Link2 style={{ width: 36, height: 36 }} />}
          title="Chưa liên kết nhân viên"
          description="Tài khoản của bạn chưa được liên kết với một hồ sơ nhân viên. Liên kết để xem tóm tắt tuần."
          action={
            <Button asChild>
              <Link href="/me">
                Liên kết ngay <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
          variant="card"
          size="lg"
        />
      </div>
    );
  }

  const {
    asOf,
    windowStartIso,
    windowEndIso,
    employee,
    totals,
    bestDay,
    highlights,
    days,
    nextWeekShifts,
    comparisons,
  } = data;

  const bestDayDDMM = bestDay ? isoToDDMM(bestDay.iso) : null;

  const timelineEntries: TimelineEntry[] = highlights.map((h, idx) => ({
    id: `${h.code}-${idx}`,
    tone: HIGHLIGHT_TONE[h.code],
    icon: highlightIcon(h.code),
    title: h.label,
    description: h.detail,
  }));

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 p-6 text-white shadow-md md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-3">
            <Badge
              variant="outline"
              className="w-fit gap-1 border-white/40 bg-white/10 text-white"
            >
              <Sparkles className="size-3" /> Tóm tắt tuần
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Tóm tắt 7 ngày của bạn
            </h1>
            <p className="max-w-xl text-sm text-white/90">
              Xin chào{" "}
              <span className="font-semibold">{employee.name}</span> · Đây là
              nhịp độ tuần qua, dữ liệu được làm mới{" "}
              <TimeAgo iso={asOf} withPrefix className="text-white/95" />.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/15 px-5 py-4 text-white shadow-sm backdrop-blur">
            <CalendarDays className="size-8 shrink-0" aria-hidden />
            <div>
              <p className="text-xs uppercase tracking-wide text-white/80">
                Khoảng tuần
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {formatIsoRange(windowStartIso, windowEndIso)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStat
          label="Giờ làm tuần"
          value={
            <LiveCounter
              to={totals.hoursWorked}
              duration={900}
              decimals={1}
            />
          }
          hint="giờ trong 7 ngày qua"
          icon={<Clock className="size-4" />}
          trend={{
            delta: comparisons.hoursVsPriorWeek,
            period: "so với tuần trước",
            direction: "up-is-good",
          }}
          variant="elevated"
        />
        <KPIStat
          label="Ngày làm việc"
          value={<LiveCounter to={totals.daysWorked} duration={700} />}
          hint={`${totals.daysWorked} / 7 ngày có chấm công`}
          icon={<CalendarDays className="size-4" />}
          variant="elevated"
        />
        <KPIStat
          label="Task hoàn thành"
          value={<LiveCounter to={totals.tasksCompleted} duration={700} />}
          hint="task xong trong tuần"
          icon={<CheckCircle2 className="size-4" />}
          trend={{
            delta: comparisons.tasksVsPriorWeek,
            period: "so với tuần trước",
            direction: "up-is-good",
          }}
          variant="elevated"
        />
        <KPIStat
          label="Kudos nhận được"
          value={<LiveCounter to={totals.kudosReceived} duration={700} />}
          hint="lời cảm ơn từ đồng đội"
          icon={<Heart className="size-4 text-rose-500" />}
          trend={{
            delta: comparisons.kudosVsPriorWeek,
            period: "so với tuần trước",
            direction: "up-is-good",
          }}
          variant="elevated"
        />
      </section>

      {/* Best day + On-time gauge + Avg hours */}
      <section className="grid gap-4 lg:grid-cols-3">
        {bestDay ? (
          <Card className="relative overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-100 via-orange-100 to-rose-200 text-amber-950 shadow-sm dark:border-amber-900/40 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-rose-950/40 dark:text-amber-100 lg:col-span-2">
            <CardHeader className="pb-2">
              <Badge
                variant="outline"
                className="w-fit gap-1 border-amber-400/60 bg-amber-50/60 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              >
                <Trophy className="size-3" /> Ngày nổi bật
              </Badge>
              <CardTitle className="mt-2 text-2xl md:text-3xl">
                {bestDay.weekday} {bestDayDDMM}
              </CardTitle>
              <CardDescription className="text-amber-900/80 dark:text-amber-100/80">
                Ngày bạn đóng góp nhiều nhất trong tuần.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold tabular-nums shadow-sm dark:bg-amber-950/40">
                  <Clock className="size-3.5" />
                  {bestDay.hoursWorked.toFixed(1)} giờ
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold tabular-nums shadow-sm dark:bg-amber-950/40">
                  <CheckCircle2 className="size-3.5" />
                  {bestDay.tasksCompleted} task
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold tabular-nums shadow-sm dark:bg-amber-950/40">
                  <Heart className="size-3.5 text-rose-500" />
                  {bestDay.kudosReceived} kudos
                </span>
                {bestDay.checkinTime || bestDay.checkoutTime ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-sm font-medium tabular-nums shadow-sm dark:bg-amber-950/40">
                    {bestDay.checkinTime ?? "--:--"} →{" "}
                    {bestDay.checkoutTime ?? "--:--"}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-muted-foreground" /> Ngày nổi
                bật
              </CardTitle>
              <CardDescription>
                Chưa có hoạt động nào để chọn ngày nổi bật trong tuần này.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đúng giờ
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <HealthScore size="lg" score={totals.onTimeRate} />
            <div className="min-w-0 space-y-1">
              <p className="text-2xl font-bold tabular-nums leading-none">
                {totals.onTimeRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                Tỉ lệ check-in đúng giờ so với ca đã lên lịch
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                <Clock className="size-3" />
                TB {totals.avgHoursPerWorkedDay.toFixed(1)} giờ/ngày
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 7-day strip */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4" /> 7 ngày gần nhất
          </CardTitle>
          <CardDescription>
            Giờ làm, giờ vào/ra và ngày nghỉ phép.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((d) => {
              const hasWork = d.hoursWorked > 0;
              return (
                <li
                  key={d.iso}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3 text-sm shadow-sm transition-colors",
                    d.onLeave
                      ? "border-sky-200/60 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/30"
                      : hasWork
                        ? "border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        : "border-dashed bg-muted/30 text-muted-foreground",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {d.weekday}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {isoToDDMM(d.iso)}
                    </span>
                  </div>
                  <p className="text-xl font-bold leading-none tabular-nums text-foreground">
                    {d.hoursWorked > 0 ? d.hoursWorked.toFixed(1) : "—"}
                    {d.hoursWorked > 0 ? (
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        giờ
                      </span>
                    ) : null}
                  </p>
                  {d.checkinTime || d.checkoutTime ? (
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {d.checkinTime ?? "--:--"} | {d.checkoutTime ?? "--:--"}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/80">
                      Không chấm công
                    </p>
                  )}
                  {d.onLeave ? (
                    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                      <Plane className="size-3" /> Nghỉ phép
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Highlights timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" /> Điểm nhấn trong tuần
          </CardTitle>
          <CardDescription>
            Những thành tựu và sự kiện đáng chú ý từ dữ liệu của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineCard
            entries={timelineEntries}
            ariaLabel="Điểm nhấn tuần"
            emptyState={
              <EmptyState
                title="Chưa có điểm nhấn"
                description="Tuần này chưa có hoạt động nổi bật nào — bắt đầu một ngày làm việc để mở khóa các điểm nhấn."
                variant="subtle"
                size="sm"
              />
            }
          />
        </CardContent>
      </Card>

      {/* Next-week shifts */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {nextWeekShifts > 0 ? (
                  <>
                    Tuần tới bạn có{" "}
                    <span className="font-bold text-primary">
                      {nextWeekShifts}
                    </span>{" "}
                    ca được xếp — sẵn sàng nhé!
                  </>
                ) : (
                  <>Chưa có ca nào được xếp cho 7 ngày tới.</>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Xem chi tiết lịch và các hành động nhanh trong trang cá nhân.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/me">
              Mở trang của tôi <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
