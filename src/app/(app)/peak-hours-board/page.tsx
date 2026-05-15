import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Clock,
  Coffee,
  MoonStar,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
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
import { StatusDot } from "@/components/risk-indicators";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Giờ cao điểm — Cafe HR",
};

type Level = "hot" | "warm" | "cool" | "empty";

type HourBucket = {
  hour: number;
  count: number;
  avgPerDay: number;
  level: Level;
};

type TopPeak = {
  hour: number;
  count: number;
  label: string;
};

type WeekdayBreakdown = {
  weekday: number;
  label: string;
  totalCheckins: number;
  dominantHour: number | null;
};

type PeakHoursResponse = {
  ok: true;
  generatedAt: string;
  windowDays: number;
  hourBuckets: HourBucket[];
  topPeaks: TopPeak[];
  quietDaytimeHours: number[];
  weekdayBreakdown: WeekdayBreakdown[];
  recommendedOpenHour: number | null;
  totalCheckins: number;
  notes: string[];
};

type SearchParams = { days?: string };

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatHour(h: number | null): string {
  if (h === null || !Number.isFinite(h)) return "—";
  return `${pad2(h)}:00`;
}

function parseDays(raw: string | undefined): number {
  if (!raw) return 30;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 30;
  if (n < 7) return 7;
  if (n > 90) return 90;
  return n;
}

const LEVEL_CELL: Record<Level, string> = {
  hot: "bg-red-500 text-white",
  warm: "bg-amber-400 text-amber-950",
  cool: "bg-sky-300 text-sky-950",
  empty: "bg-muted text-muted-foreground",
};

const LEVEL_SWATCH: Record<Level, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-400",
  cool: "bg-sky-300",
  empty: "bg-muted",
};

const LEVEL_LABEL: Record<Level, string> = {
  hot: "Rất đông",
  warm: "Khá đông",
  cool: "Vừa phải",
  empty: "Vắng / Không có",
};

const RANK_GRADIENT: Record<number, string> = {
  0: "from-yellow-400 via-amber-400 to-amber-600 text-amber-950",
  1: "from-slate-200 via-slate-300 to-slate-400 text-slate-900",
  2: "from-orange-300 via-orange-400 to-orange-700 text-orange-950",
};

const RANK_LABEL: Record<number, string> = {
  0: "Hạng 1 — Vàng",
  1: "Hạng 2 — Bạc",
  2: "Hạng 3 — Đồng",
};

// Order weekdays as T2..CN. API returns weekday in JS Date.getDay() convention
// (0=Sunday..6=Saturday). Map to Mon-first display order.
const WEEKDAY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];

async function fetchPeakHours(days: number): Promise<PeakHoursResponse> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  const res = await fetch(`${base}/api/peak-hours?days=${days}`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) {
    throw new Error(`Peak hours API trả về HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Phản hồi peak-hours không hợp lệ");
  }
  return data as PeakHoursResponse;
}

export default async function PeakHoursBoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const days = parseDays(sp.days);

  const data = await fetchPeakHours(days);

  const topPeakHourSet = new Set<number>(data.topPeaks.map((p) => p.hour));
  const topPeakLabel =
    data.topPeaks.length > 0 ? data.topPeaks[0].label : "—";

  // Map weekdayBreakdown by JS-day for Mon-first display.
  const byWeekday = new Map<number, WeekdayBreakdown>();
  for (const w of data.weekdayBreakdown) {
    byWeekday.set(w.weekday, w);
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-orange-200 via-orange-100 to-amber-200 p-6 dark:from-orange-950/40 dark:via-orange-900/20 dark:to-amber-950/30 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit gap-1 bg-background/60">
              <Coffee className="size-3" /> Bảng điều khiển quản trị
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Giờ cao điểm
            </h1>
            <p className="max-w-xl text-sm text-foreground/80">
              Phân tích {data.windowDays} ngày check-in gần đây để xác định
              khung giờ đông khách và đề xuất giờ mở cửa hiệu quả.
            </p>
            <p className="text-xs text-foreground/70">
              Cập nhật <TimeAgo iso={data.generatedAt} withPrefix />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30, 60, 90].map((d) => (
              <a
                key={d}
                href={`/peak-hours-board?days=${d}`}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  d === data.windowDays
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background/60 text-foreground hover:bg-background/80",
                )}
              >
                {d} ngày
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="size-5" />}
          label="Tổng check-in"
          value={<LiveCounter to={data.totalCheckins} duration={800} />}
          sublabel={`Trong ${data.windowDays} ngày`}
          tone="primary"
        />
        <KpiCard
          icon={<Trophy className="size-5" />}
          label="Khung giờ đông nhất"
          value={
            <span className="text-2xl font-bold tabular-nums">
              {topPeakLabel}
            </span>
          }
          sublabel={
            data.topPeaks.length > 0
              ? `${data.topPeaks[0].count} lượt`
              : "Chưa có dữ liệu"
          }
          tone="accent"
        />
        <KpiCard
          icon={<MoonStar className="size-5" />}
          label="Giờ vắng"
          value={
            <LiveCounter
              to={data.quietDaytimeHours.length}
              duration={700}
            />
          }
          sublabel="Khung ban ngày <1 lượt/ngày"
          tone="secondary"
        />
        <KpiCard
          icon={<Sunrise className="size-5" />}
          label="Giờ mở cửa khuyến nghị"
          value={
            <span className="text-2xl font-bold tabular-nums">
              {formatHour(data.recommendedOpenHour)}
            </span>
          }
          sublabel="Mốc đầu tiên ≥0.5 lượt/ngày"
          tone="primary"
        />
      </section>

      {/* 24-hour heat strip */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Nhịp 24 giờ
          </CardTitle>
          <CardDescription>
            Mỗi ô là một khung giờ trong ngày. Màu càng nóng — càng đông.
            Sao vàng đánh dấu top 3 khung giờ cao điểm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1">
              {data.hourBuckets.map((b) => {
                const isTop = topPeakHourSet.has(b.hour);
                return (
                  <div
                    key={b.hour}
                    title={`${pad2(b.hour)}:00 — ${b.count} lượt (${b.avgPerDay.toFixed(2)} lượt/ngày)`}
                    className={cn(
                      "relative flex h-16 w-12 flex-col items-center justify-center rounded-md text-xs font-semibold shadow-sm",
                      LEVEL_CELL[b.level],
                    )}
                  >
                    {isTop ? (
                      <Star
                        className="absolute right-0.5 top-0.5 size-3 fill-yellow-300 text-yellow-500 drop-shadow"
                        aria-hidden
                      />
                    ) : null}
                    <span className="text-sm font-bold tabular-nums">
                      {pad2(b.hour)}
                    </span>
                    <span className="mt-0.5 text-[10px] font-medium opacity-90 tabular-nums">
                      {b.avgPerDay.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Chú thích:</span>
            {(Object.keys(LEVEL_SWATCH) as Level[]).map((lv) => (
              <span key={lv} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block size-3 rounded-sm",
                    LEVEL_SWATCH[lv],
                  )}
                  aria-hidden
                />
                {LEVEL_LABEL[lv]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <Star
                className="size-3 fill-yellow-300 text-yellow-500"
                aria-hidden
              />
              Top 3 cao điểm
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 peaks */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="size-4 text-amber-500" /> Top 3 khung giờ cao điểm
        </h2>
        {data.topPeaks.length === 0 ? (
          <EmptyState
            variant="default"
            title="Chưa có dữ liệu cao điểm"
            description="Không tìm thấy lượt check-in nào trong khoảng thời gian này."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {data.topPeaks.map((p, idx) => (
              <div
                key={p.hour}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-6 shadow-md",
                  "bg-gradient-to-br",
                  RANK_GRADIENT[idx] ?? RANK_GRADIENT[2],
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {RANK_LABEL[idx] ?? "Top"}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{p.label}</p>
                  </div>
                  <Trophy className="size-8 opacity-70" aria-hidden />
                </div>
                <p className="mt-4 text-5xl font-bold leading-none tabular-nums">
                  {p.count}
                </p>
                <p className="mt-1 text-xs opacity-80">lượt check-in</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Weekday breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Phân bố theo ngày trong tuần
          </CardTitle>
          <CardDescription>
            Tổng số lượt check-in và khung giờ đỉnh điểm cho từng ngày trong
            tuần.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {WEEKDAY_ORDER.map((wd) => {
              const w = byWeekday.get(wd);
              if (!w) return null;
              const hasData = w.totalCheckins > 0;
              return (
                <li
                  key={wd}
                  className={cn(
                    "flex flex-col items-center rounded-xl border p-4 text-center shadow-sm",
                    hasData
                      ? "bg-card"
                      : "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {w.label}
                  </span>
                  <span className="mt-2 text-3xl font-bold tabular-nums">
                    {w.totalCheckins}
                  </span>
                  <span className="mt-1 text-[11px] opacity-80">lượt</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs">
                    <StatusDot
                      level={hasData ? "info" : "muted"}
                      size="sm"
                    />
                    Đỉnh:{" "}
                    <span className="font-semibold tabular-nums">
                      {formatHour(w.dominantHour)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Quiet daytime hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MoonStar className="size-4" /> Khung giờ ban ngày vắng
          </CardTitle>
          <CardDescription>
            Các khung giờ trong khoảng 06:00–21:00 có trung bình {"<"} 1
            lượt/ngày — cơ hội để đẩy mạnh khuyến mãi hoặc giảm nhân lực.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.quietDaytimeHours.length === 0 ? (
            <EmptyState
              variant="subtle"
              title="Không có khung giờ vắng nổi bật"
              description="Mọi khung giờ ban ngày đều có lưu lượng đáng kể."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.quietDaytimeHours.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                >
                  <MoonStar className="size-3.5" aria-hidden />
                  {formatHour(h)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Nhận định
          </CardTitle>
          <CardDescription>
            Các điểm đáng chú ý được rút ra từ dữ liệu check-in gần đây.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.notes.length === 0 ? (
            <EmptyState
              variant="subtle"
              title="Chưa có nhận định"
              description="Hệ thống chưa rút ra được nhận định nào từ dữ liệu hiện tại."
            />
          ) : (
            <ul className="space-y-2">
              {data.notes.map((n, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm leading-relaxed"
                >
                  <Sparkles
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
            <p className="truncate text-xs text-muted-foreground">
              {sublabel}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
