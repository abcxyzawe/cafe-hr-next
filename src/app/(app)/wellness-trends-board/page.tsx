import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Activity, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPIStat } from "@/components/kpi-stat";
import { TimeAgo } from "@/components/time-ago";
import { EmptyState } from "@/components/empty-state";
import { HealthScore } from "@/components/risk-indicators";
import { MiniSparkline } from "@/components/mini-sparkline";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Xu hướng vận hành đội ngũ — Cafe HR",
};

type WeekBucket = {
  weekStartIso: string;
  weekEndIso: string;
  label: string;
  totalHours: number;
  totalCheckins: number;
  avgHoursPerCheckin: number;
  uniqueEmployees: number;
  kudos: number;
  tasksCompleted: number;
  leavesApproved: number;
  lateCheckouts: number;
  wellnessIndex: number;
};

type WellnessTrendResponse = {
  ok: true;
  generatedAt: string;
  windowWeeks: number;
  weeks: WeekBucket[];
  sparklines: {
    hours: number[];
    kudos: number[];
    tasks: number[];
    wellnessIndex: number[];
    leaves: number[];
  };
  latest: WeekBucket | null;
  deltas: {
    hoursVsPrior: number;
    kudosVsPrior: number;
    tasksVsPrior: number;
    wellnessVsPrior: number;
  };
  insights: string[];
};

type SearchParams = { weeks?: string };

const WEEK_PRESETS: readonly number[] = [4, 8, 13, 26];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parseWeeks(raw: string | undefined): number {
  const n = Number(raw ?? "8");
  if (!Number.isFinite(n)) return 8;
  return clamp(Math.floor(n), 2, 26);
}

async function fetchTrends(
  weeks: number,
): Promise<WellnessTrendResponse | null> {
  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    const cookie = h.get("cookie") ?? "";
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
    const res = await fetch(
      `${base}/api/wellness/trends?weeks=${weeks}`,
      {
        cache: "no-store",
        headers: { cookie },
      },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      (data as { ok?: unknown }).ok !== true
    ) {
      return null;
    }
    return data as WellnessTrendResponse;
  } catch {
    return null;
  }
}

function fmt1(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return (Math.round(n * 10) / 10).toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("vi-VN");
}

function tail<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  return arr.slice(arr.length - n);
}

function seriesStats(values: number[]): {
  current: number;
  min: number;
  max: number;
  avg: number;
} {
  if (values.length === 0) {
    return { current: 0, min: 0, max: 0, avg: 0 };
  }
  let min = values[0];
  let max = values[0];
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return {
    current: values[values.length - 1],
    min,
    max,
    avg: sum / values.length,
  };
}

export default async function WellnessTrendsBoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const weeks = parseWeeks(sp.weeks);

  const data = await fetchTrends(weeks);

  if (!data) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <Badge variant="outline" className="w-fit gap-1">
            <Activity className="size-3" /> Xu hướng vận hành
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Xu hướng vận hành đội ngũ
          </h1>
        </header>
        <EmptyState
          icon={<Activity style={{ width: 36, height: 36 }} />}
          title="Không tải được dữ liệu xu hướng"
          description="API /api/wellness/trends không phản hồi hoặc bạn không có quyền quản trị."
          variant="card"
          size="lg"
        />
      </div>
    );
  }

  const { windowWeeks, weeks: weekRows, sparklines, latest, deltas, insights } =
    data;

  const hoursStats = seriesStats(sparklines.hours);
  const kudosStats = seriesStats(sparklines.kudos);
  const tasksStats = seriesStats(sparklines.tasks);
  const wellnessStats = seriesStats(sparklines.wellnessIndex);

  const last8Hours = tail(sparklines.hours, 8);
  const last8Kudos = tail(sparklines.kudos, 8);
  const last8Tasks = tail(sparklines.tasks, 8);
  const last8Wellness = tail(sparklines.wellnessIndex, 8);

  const tableRows = tail(weekRows, 8);
  const currentWeekIso = latest?.weekStartIso ?? null;

  return (
    <div className="space-y-6">
      {/* Header card: emerald → teal gradient */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-200 via-emerald-100 to-teal-200 p-6 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/30 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit gap-1 bg-background/60">
              <Activity className="size-3" /> Bảng điều khiển quản trị
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Xu hướng vận hành đội ngũ
            </h1>
            <p className="max-w-xl text-sm text-foreground/80">
              {windowWeeks} tuần gần nhất — chỉ số tổng hợp từ giờ làm, kudos,
              công việc, nghỉ phép và tan ca muộn.
            </p>
            <p className="text-xs text-muted-foreground">
              Cập nhật <TimeAgo iso={data.generatedAt} withPrefix />
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border bg-card/70 px-6 py-5 shadow-sm backdrop-blur">
            <Activity
              aria-hidden
              className="size-10 shrink-0 text-emerald-600 dark:text-emerald-400"
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chỉ số sức khỏe tuần này
              </p>
              <p className="text-4xl font-bold leading-none tabular-nums text-foreground">
                {latest ? Math.round(latest.wellnessIndex) : "—"}
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  / 100
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Week selector pills */}
      <nav
        aria-label="Chọn số tuần"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Cửa sổ thời gian:
        </span>
        {WEEK_PRESETS.map((w) => {
          const active = w === windowWeeks;
          return (
            <Link
              key={w}
              href={`/wellness-trends-board?weeks=${w}`}
              prefetch={false}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors",
                active
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {w} tuần
            </Link>
          );
        })}
      </nav>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <HealthScore
            score={latest ? latest.wellnessIndex : 0}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Chỉ số sức khỏe
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {latest ? Math.round(latest.wellnessIndex) : "—"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  deltas.wellnessVsPrior > 0
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : deltas.wellnessVsPrior < 0
                      ? "bg-red-500/15 text-red-700 dark:text-red-400"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {deltas.wellnessVsPrior > 0 ? "+" : ""}
                {deltas.wellnessVsPrior}
              </span>
              <span className="text-xs text-muted-foreground">
                so với tuần trước
              </span>
            </div>
          </div>
        </div>

        <KPIStat
          label="Giờ tuần này"
          value={fmt1(latest?.totalHours ?? 0)}
          hint="giờ"
          trend={{
            delta: deltas.hoursVsPrior,
            direction: "up-is-good",
            period: "so với tuần trước",
          }}
          sparklineValues={
            last8Hours.length >= 2 ? last8Hours : undefined
          }
        />

        <KPIStat
          label="Kudos"
          value={fmtInt(latest?.kudos ?? 0)}
          hint="lượt khen"
          trend={{
            delta: deltas.kudosVsPrior,
            direction: "up-is-good",
            period: "so với tuần trước",
          }}
          sparklineValues={
            last8Kudos.length >= 2 ? last8Kudos : undefined
          }
        />

        <KPIStat
          label="Task xong"
          value={fmtInt(latest?.tasksCompleted ?? 0)}
          hint="công việc"
          trend={{
            delta: deltas.tasksVsPrior,
            direction: "up-is-good",
            period: "so với tuần trước",
          }}
          sparklineValues={
            last8Tasks.length >= 2 ? last8Tasks : undefined
          }
        />
      </section>

      {/* Auto insights */}
      <Card className="border-amber-300/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Sparkles className="size-4" /> Nhận định tự động
          </CardTitle>
          <CardDescription>
            Phát hiện dựa trên so sánh tuần này với tuần trước.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-amber-950 dark:text-amber-100"
              >
                <Sparkles
                  className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Big chart section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" /> Diễn biến theo tuần
          </CardTitle>
          <CardDescription>
            Mỗi dòng là một chỉ số, cập nhật theo {windowWeeks} tuần gần nhất.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartRow
            label="Giờ làm"
            unit="giờ"
            values={sparklines.hours}
            stats={hoursStats}
            decimals={1}
            stroke="rgb(16 185 129)"
          />
          <ChartRow
            label="Kudos"
            unit="lượt"
            values={sparklines.kudos}
            stats={kudosStats}
            decimals={0}
            stroke="rgb(244 114 182)"
          />
          <ChartRow
            label="Task hoàn thành"
            unit="task"
            values={sparklines.tasks}
            stats={tasksStats}
            decimals={0}
            stroke="rgb(59 130 246)"
          />
          <ChartRow
            label="Chỉ số sức khỏe"
            unit="/ 100"
            values={sparklines.wellnessIndex}
            stats={wellnessStats}
            decimals={0}
            stroke="rgb(20 184 166)"
          />
        </CardContent>
      </Card>

      {/* Weekly table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo tuần</CardTitle>
          <CardDescription>
            8 tuần gần nhất — hàng cuối là tuần hiện tại.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">Tuần</th>
                <th className="px-2 py-2 text-right font-medium">Giờ</th>
                <th className="px-2 py-2 text-right font-medium">NV</th>
                <th className="px-2 py-2 text-right font-medium">Kudos</th>
                <th className="px-2 py-2 text-right font-medium">Task</th>
                <th className="px-2 py-2 text-right font-medium">Nghỉ</th>
                <th className="px-2 py-2 text-right font-medium">
                  Tan ca muộn
                </th>
                <th className="px-2 py-2 text-right font-medium">Wellness</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-2 py-6 text-center text-muted-foreground"
                  >
                    Chưa có dữ liệu trong cửa sổ này.
                  </td>
                </tr>
              ) : (
                tableRows.map((w) => {
                  const isCurrent = w.weekStartIso === currentWeekIso;
                  return (
                    <tr
                      key={w.weekStartIso}
                      className={cn(
                        "border-b last:border-b-0",
                        isCurrent &&
                          "bg-emerald-50 font-semibold dark:bg-emerald-950/30",
                      )}
                    >
                      <td className="px-2 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <span>{w.label}</span>
                          {isCurrent ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                              Hiện tại
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {fmt1(w.totalHours)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {fmtInt(w.uniqueEmployees)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {fmtInt(w.kudos)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {fmtInt(w.tasksCompleted)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {fmtInt(w.leavesApproved)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {fmtInt(w.lateCheckouts)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Math.round(w.wellnessIndex)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartRow({
  label,
  unit,
  values,
  stats,
  decimals,
  stroke,
}: {
  label: string;
  unit: string;
  values: number[];
  stats: { current: number; min: number; max: number; avg: number };
  decimals: 0 | 1;
  stroke: string;
}) {
  const fmt = decimals === 1 ? fmt1 : fmtInt;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card/50 p-3">
      <div className="w-32 shrink-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums">
          {fmt(stats.current)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        </p>
      </div>
      <div className="flex-1 min-w-[280px]" style={{ color: stroke }}>
        <MiniSparkline
          values={values}
          width={400}
          height={60}
          strokeWidth={2}
          fill
          title={`${label}: ${values.length} điểm`}
        />
      </div>
      <dl className="grid w-44 shrink-0 grid-cols-3 gap-2 text-center text-xs tabular-nums">
        <div>
          <dt className="text-muted-foreground">Min</dt>
          <dd className="font-semibold">{fmt(stats.min)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">TB</dt>
          <dd className="font-semibold">{fmt(stats.avg)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Max</dt>
          <dd className="font-semibold">{fmt(stats.max)}</dd>
        </div>
      </dl>
    </div>
  );
}
