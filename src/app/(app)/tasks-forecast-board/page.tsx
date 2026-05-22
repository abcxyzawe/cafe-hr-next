import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  Flag,
  Gauge,
  HelpCircle,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { KPIStat } from "@/components/kpi-stat";
import { LiveCounter } from "@/components/live-counter";
import { TimeAgo } from "@/components/time-ago";
import {
  HealthScore,
  RiskBadge,
  StatusDot,
} from "@/components/risk-indicators";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ForecastStatus = "overdue" | "at_risk" | "on_track" | "no_due_date";
type Confidence = "high" | "medium" | "low";

type ForecastItem = {
  id: number;
  title: string;
  assignee: { id: number; name: string; role: string } | null;
  dueDateIso: string | null;
  daysToDue: number | null;
  status: ForecastStatus;
  confidence: Confidence;
  priority: string;
  assigneeVelocity: {
    completed60d: number;
    avgDaysToComplete: number | null;
    hasLowCadence: boolean;
  };
  etaIso: string | null;
  recommendationVi: string;
};

type ForecastResponse = {
  ok: true;
  generatedAt: string;
  summary: {
    totalOpen: number;
    overdue: number;
    atRisk: number;
    onTrack: number;
    noDueDate: number;
    healthScore: number;
  };
  items: ForecastItem[];
};

const STATUS_META: Record<
  ForecastStatus,
  {
    label: string;
    pillClass: string;
    barClass: string;
    icon: React.ComponentType<{ className?: string }>;
    sortOrder: number;
  }
> = {
  overdue: {
    label: "Quá hạn",
    pillClass:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    barClass: "from-red-600 to-rose-500",
    icon: AlertOctagon,
    sortOrder: 0,
  },
  at_risk: {
    label: "Có rủi ro",
    pillClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    barClass: "from-amber-500 to-orange-500",
    icon: AlertTriangle,
    sortOrder: 1,
  },
  on_track: {
    label: "Đúng tiến độ",
    pillClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    barClass: "from-emerald-500 to-teal-500",
    icon: CheckCircle2,
    sortOrder: 2,
  },
  no_due_date: {
    label: "Chưa đặt hạn",
    pillClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
    barClass: "from-slate-400 to-slate-500",
    icon: HelpCircle,
    sortOrder: 3,
  },
};

const PRIORITY_META: Record<
  string,
  { label: string; className: string }
> = {
  urgent: {
    label: "Khẩn",
    className: "bg-red-500/15 text-red-700 dark:text-red-300",
  },
  high: {
    label: "Cao",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  normal: {
    label: "Thường",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  low: {
    label: "Thấp",
    className: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
};

const CONFIDENCE_META: Record<Confidence, string> = {
  high: "Tin cậy cao",
  medium: "Tin cậy vừa",
  low: "Tin cậy thấp",
};

async function fetchForecast(): Promise<ForecastResponse | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  try {
    const res = await fetch(`${base}/api/tasks/forecast`, {
      cache: "no-store",
      headers: { cookie },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      (data as { ok?: unknown }).ok !== true
    ) {
      return null;
    }
    return data as ForecastResponse;
  } catch {
    return null;
  }
}

function fmtVnDate(iso: string | null): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function daysToDueLabel(d: number | null): string {
  if (d === null) return "Không hạn";
  if (d === 0) return "Hôm nay";
  if (d === 1) return "Còn 1 ngày";
  if (d === -1) return "Trễ 1 ngày";
  if (d < 0) return `Trễ ${Math.abs(d)} ngày`;
  return `Còn ${d} ngày`;
}

function priorityPill(priority: string): React.ReactElement {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.normal;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full text-[10px] px-1.5 py-0.5 font-medium",
        meta.className,
      )}
    >
      <Flag className="size-3 mr-1" />
      {meta.label}
    </span>
  );
}

function ForecastCard({ item }: { item: ForecastItem }) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  const v = item.assigneeVelocity;
  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", meta.barClass)}
        aria-hidden
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span
                className={cn(
                  "inline-flex items-center rounded-full border text-[10px] px-1.5 py-0.5 font-medium",
                  meta.pillClass,
                )}
              >
                {meta.label}
              </span>
              {priorityPill(item.priority)}
            </div>
            <CardTitle className="text-base leading-snug">
              {item.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-0.5">
            <dt className="text-muted-foreground">Hạn chót</dt>
            <dd className="font-medium tabular-nums">
              {fmtVnDate(item.dueDateIso)}
            </dd>
            <dd
              className={cn(
                "text-[11px]",
                item.daysToDue !== null && item.daysToDue < 0
                  ? "text-red-600 dark:text-red-400 font-semibold"
                  : "text-muted-foreground",
              )}
            >
              {daysToDueLabel(item.daysToDue)}
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-muted-foreground">Dự kiến xong</dt>
            <dd className="font-medium tabular-nums">{fmtVnDate(item.etaIso)}</dd>
            <dd className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Gauge className="size-3" />
              {CONFIDENCE_META[item.confidence]}
            </dd>
          </div>
        </dl>

        {item.assignee && (
          <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
            <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {item.assignee.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{item.assignee.name}</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                {item.assignee.role}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase text-muted-foreground">
                Tốc độ
              </div>
              <div className="text-[11px] font-medium">
                {v.completed60d} task
                {v.avgDaysToComplete !== null && (
                  <span className="text-muted-foreground">
                    {" "}
                    · ~{v.avgDaysToComplete}d
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {!item.assignee && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 px-2.5 py-1.5 text-xs text-muted-foreground">
            <HelpCircle className="size-3.5" />
            Chưa giao cho ai
          </div>
        )}

        <div
          className={cn(
            "rounded-md text-xs px-2.5 py-2 border",
            item.status === "overdue" &&
              "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200",
            item.status === "at_risk" &&
              "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200",
            item.status === "on_track" &&
              "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200",
            item.status === "no_due_date" &&
              "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800",
          )}
        >
          <Sparkles className="inline size-3 mr-1 -mt-0.5" />
          {item.recommendationVi}
        </div>
      </CardContent>
    </Card>
  );
}

type StatusFilter = ForecastStatus | "all";

export default async function TasksForecastBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const filter: StatusFilter =
    sp.status === "overdue" ||
    sp.status === "at_risk" ||
    sp.status === "on_track" ||
    sp.status === "no_due_date"
      ? sp.status
      : "all";

  const data = await fetchForecast();
  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <EmptyState
          variant="card"
          size="lg"
          icon={<Target className="size-12 text-muted-foreground" />}
          title="Không tải được dự báo task"
          description="API /api/tasks/forecast trả về lỗi. Hãy thử lại sau."
          action={
            <Button asChild>
              <Link href="">Thử lại</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { summary, items } = data;
  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  filtered.sort((a, b) => {
    if (STATUS_META[a.status].sortOrder !== STATUS_META[b.status].sortOrder)
      return STATUS_META[a.status].sortOrder - STATUS_META[b.status].sortOrder;
    const ad = a.daysToDue ?? Number.MAX_SAFE_INTEGER;
    const bd = b.daysToDue ?? Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  const tabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "Tất cả", count: summary.totalOpen },
    { value: "overdue", label: "Quá hạn", count: summary.overdue },
    { value: "at_risk", label: "Rủi ro", count: summary.atRisk },
    { value: "on_track", label: "Đúng hạn", count: summary.onTrack },
    { value: "no_due_date", label: "Không hạn", count: summary.noDueDate },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <Card className="border-indigo-300/50 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-cyan-950/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
                <Compass className="size-7" />
              </div>
              <div>
                <CardTitle className="text-2xl">Dự báo tiến độ task</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Clock className="size-3.5" />
                  Cập nhật <TimeAgo iso={data.generatedAt} withPrefix />
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HealthScore score={summary.healthScore} size="lg" />
              <div className="text-xs">
                <div className="text-muted-foreground uppercase tracking-wide">
                  Vận hành
                </div>
                <div className="font-semibold">Điểm tổng</div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPIStat
          label="Task mở"
          value={<LiveCounter to={summary.totalOpen} />}
          icon={<Target className="size-4" />}
          variant="default"
        />
        <KPIStat
          label="Quá hạn"
          value={<LiveCounter to={summary.overdue} />}
          icon={<AlertOctagon className="size-4 text-red-500" />}
          trend={
            summary.overdue > 0
              ? {
                  delta: summary.overdue,
                  direction: "down-is-good",
                  deltaLabel: `${summary.overdue} task`,
                  period: "cần xử lý",
                }
              : undefined
          }
          variant="accent"
        />
        <KPIStat
          label="Có rủi ro"
          value={<LiveCounter to={summary.atRisk} />}
          icon={<AlertTriangle className="size-4 text-amber-500" />}
          variant="default"
        />
        <KPIStat
          label="Đúng tiến độ"
          value={<LiveCounter to={summary.onTrack} />}
          icon={<TrendingUp className="size-4 text-emerald-500" />}
          variant="subtle"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.value;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/tasks-forecast-board"
                  : `/tasks-forecast-board?status=${tab.value}`
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-accent",
              )}
            >
              <StatusDot
                level={
                  tab.value === "overdue"
                    ? "high"
                    : tab.value === "at_risk"
                      ? "medium"
                      : tab.value === "on_track"
                        ? "success"
                        : tab.value === "no_due_date"
                          ? "muted"
                          : "info"
                }
                pulse={tab.value === "overdue" && tab.count > 0}
              />
              <span>{tab.label}</span>
              <Badge
                variant="secondary"
                className={cn(
                  "tabular-nums",
                  active && "bg-primary-foreground/20 text-primary-foreground",
                )}
              >
                {tab.count}
              </Badge>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant="card"
          size="md"
          icon={<CheckCircle2 className="size-12 text-emerald-500" />}
          title={
            filter === "overdue"
              ? "Không có task quá hạn — tuyệt vời!"
              : filter === "at_risk"
                ? "Không có task rủi ro"
                : filter === "on_track"
                  ? "Chưa có task nào đúng tiến độ"
                  : "Không có task nào ở trạng thái này"
          }
          description="Hãy thử bộ lọc khác hoặc quay lại sau khi có dữ liệu mới."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <ForecastCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 text-xs text-muted-foreground flex items-center gap-2">
          <Zap className="size-3.5" />
          Dự báo dựa trên vận tốc lịch sử 60 ngày của từng người được giao.
          <CalendarClock className="size-3.5 ml-auto" />
          Mức điểm vận hành = 100 − (quá hạn × 5 + rủi ro × 2).
        </CardContent>
      </Card>
    </div>
  );
}
