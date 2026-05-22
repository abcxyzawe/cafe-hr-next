import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Clock,
  Flame,
  HeartHandshake,
  MoonStar,
  RefreshCw,
  Smile,
  Sun,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KPIStat } from "@/components/kpi-stat";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cảnh báo quá tải vận hành — Cafe HR",
};

type RiskLevel = "low" | "medium" | "high";

type Signals = {
  consecutiveDaysWorked: number;
  totalHoursLast7: number;
  totalHoursLast30: number;
  avgHoursPerWorkedDay30: number;
  daysWithoutLeaveLast90: number;
  lateCheckoutCount30: number;
  daysOff7: number;
};

type EmployeeRef = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type BurnoutItem = {
  employee: EmployeeRef;
  riskScore: number;
  riskLevel: RiskLevel;
  signals: Signals;
  reasons: string[];
  recommendationVi: string;
};

type BurnoutResponse = {
  ok: true;
  generatedAt: string;
  windowDays: 30;
  summary: {
    total: number;
    low: number;
    medium: number;
    high: number;
    avgRisk: number;
  };
  items: BurnoutItem[];
};

async function fetchBurnout(): Promise<BurnoutResponse | null> {
  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    const cookie = h.get("cookie") ?? "";
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
    const res = await fetch(`${base}/api/burnout-risk`, {
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
    return data as BurnoutResponse;
  } catch {
    return null;
  }
}

function isLevel(v: string | undefined): v is RiskLevel {
  return v === "low" || v === "medium" || v === "high";
}

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1] ?? trimmed;
  return last.charAt(0).toUpperCase();
}

function levelBarGradient(level: RiskLevel): string {
  if (level === "high") return "bg-gradient-to-r from-red-500 to-rose-600";
  if (level === "medium") return "bg-gradient-to-r from-amber-400 to-orange-500";
  return "bg-gradient-to-r from-emerald-400 to-teal-500";
}

function levelBarFill(level: RiskLevel): string {
  if (level === "high") return "bg-red-500";
  if (level === "medium") return "bg-amber-500";
  return "bg-emerald-500";
}

function levelTextClass(level: RiskLevel): string {
  if (level === "high") return "text-red-600 dark:text-red-400";
  if (level === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function levelRecommendationBox(level: RiskLevel): string {
  if (level === "high")
    return "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100";
  if (level === "medium")
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100";
  return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100";
}

function levelLabel(level: RiskLevel): string {
  if (level === "high") return "Nguy cơ cao";
  if (level === "medium") return "Nguy cơ vừa";
  return "Nguy cơ thấp";
}

type TabKey = "all" | RiskLevel;

const TABS: { key: TabKey; label: string; query: string }[] = [
  { key: "all", label: "Tất cả", query: "" },
  { key: "high", label: "Nguy cơ cao", query: "?level=high" },
  { key: "medium", label: "Vừa", query: "?level=medium" },
  { key: "low", label: "Thấp", query: "?level=low" },
];

export default async function BurnoutBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");

  const sp = await searchParams;
  const activeTab: TabKey = isLevel(sp.level) ? sp.level : "all";

  const data = await fetchBurnout();

  if (!data) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState
          icon={<RefreshCw style={{ width: 36, height: 36 }} />}
          title="Không tải được dữ liệu"
          description="Không thể lấy dữ liệu cảnh báo quá tải. Vui lòng thử lại."
          action={
            <Link
              href="/burnout-board"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="size-4" /> Thử lại
            </Link>
          }
          variant="card"
          size="lg"
        />
      </div>
    );
  }

  const { summary, items } = data;
  const visibleItems =
    activeTab === "all"
      ? items
      : items.filter((it) => it.riskLevel === activeTab);

  return (
    <div className="space-y-6">
      <Header />

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStat
          label="Tổng nhân viên"
          value={summary.total}
          icon={<Users className="size-5" />}
          hint="Trong phạm vi 30 ngày"
        />
        <KPIStat
          label="Nguy cơ cao"
          value={summary.high}
          variant="accent"
          icon={<AlertTriangle className="text-red-500" />}
          hint="Cần can thiệp ngay"
        />
        <KPIStat
          label="Nguy cơ vừa"
          value={summary.medium}
          icon={<AlertCircle className="text-amber-500" />}
          hint="Theo dõi sát"
        />
        <KPIStat
          label="Điểm rủi ro TB"
          value={summary.avgRisk}
          variant="subtle"
          icon={<Flame className="size-5" />}
          hint="Trung bình toàn đội"
        />
      </section>

      {/* Filter tabs */}
      <nav className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc mức nguy cơ">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === "all"
              ? summary.total
              : tab.key === "high"
                ? summary.high
                : tab.key === "medium"
                  ? summary.medium
                  : summary.low;
          return (
            <Link
              key={tab.key}
              href={`/burnout-board${tab.query}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card text-foreground hover:bg-accent/40",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Card grid or empty state */}
      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<Smile style={{ width: 36, height: 36 }} />}
          title="Không có nhân viên ở mức này"
          description="Hiện chưa có nhân viên nào rơi vào nhóm rủi ro được chọn. Hãy thử bộ lọc khác."
          variant="card"
          size="lg"
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <BurnoutCard key={item.employee.id} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}

function Header() {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-6 dark:from-rose-950/40 dark:via-orange-950/30 dark:to-amber-950/40 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/60 bg-white/60 px-3 py-1 text-xs font-medium text-rose-700 backdrop-blur dark:bg-rose-950/40 dark:text-rose-200">
            <AlertTriangle className="size-3" /> Cảnh báo nội bộ
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            Cảnh báo quá tải vận hành
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Theo dõi tải vận hành của toàn quán dựa trên 30 ngày dữ liệu chấm
            công. Mỗi nhân viên được chấm điểm rủi ro từ 0–100 dựa trên chuỗi
            ngày làm liên tục, tổng giờ, ca khuya và lịch nghỉ phép.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-xl border bg-white/70 px-4 py-3 text-xs text-muted-foreground shadow-sm backdrop-blur dark:bg-background/60 md:flex">
          <Flame className="size-4 text-rose-500" />
          <span>Dữ liệu 30 ngày gần nhất</span>
        </div>
      </div>
    </section>
  );
}

function BurnoutCard({ item }: { item: BurnoutItem }) {
  const { employee, riskScore, riskLevel, signals, reasons, recommendationVi } =
    item;
  const pct = Math.max(0, Math.min(100, riskScore));

  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Top color bar */}
      <div className={cn("h-1.5 w-full", levelBarGradient(riskLevel))} />

      <div className="space-y-4 p-5">
        {/* Identity row */}
        <div className="flex items-center gap-3">
          {employee.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.avatarUrl}
              alt={employee.name}
              className="size-12 shrink-0 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary">
              {initial(employee.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight">
              {employee.name}
            </p>
            <span className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {employee.role}
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              levelTextClass(riskLevel),
              riskLevel === "high"
                ? "bg-red-500/10"
                : riskLevel === "medium"
                  ? "bg-amber-500/10"
                  : "bg-emerald-500/10",
            )}
          >
            {levelLabel(riskLevel)}
          </span>
        </div>

        {/* Risk score + progress */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Điểm rủi ro
            </span>
            <span
              className={cn(
                "text-3xl font-bold tabular-nums leading-none",
                levelTextClass(riskLevel),
              )}
            >
              {riskScore}
              <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                /100
              </span>
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                levelBarFill(riskLevel),
              )}
              style={{ width: `${pct}%` }}
              aria-label={`Điểm ${riskScore} trên 100`}
            />
          </div>
        </div>

        {/* Signal pills */}
        <div className="flex flex-wrap gap-1.5">
          <SignalPill
            icon={<Flame className="size-3" />}
            label={`${signals.consecutiveDaysWorked} ngày liên tục`}
            title="Số ngày làm việc liên tục"
          />
          <SignalPill
            icon={<Clock className="size-3" />}
            label={`${signals.totalHoursLast7}h / 7n`}
            title="Tổng giờ trong 7 ngày qua"
          />
          <SignalPill
            icon={<Sun className="size-3" />}
            label={`${signals.totalHoursLast30}h / 30n`}
            title="Tổng giờ trong 30 ngày qua"
          />
          <SignalPill
            icon={<Sun className="size-3" />}
            label={`TB ${signals.avgHoursPerWorkedDay30}h/ngày`}
            title="Giờ TB mỗi ngày có làm"
          />
          <SignalPill
            icon={<CalendarDays className="size-3" />}
            label={
              signals.daysWithoutLeaveLast90 >= 90
                ? "0 phép / 90n"
                : "Đã có phép / 90n"
            }
            title="Lịch sử nghỉ phép 90 ngày"
          />
          <SignalPill
            icon={<MoonStar className="size-3" />}
            label={`${signals.lateCheckoutCount30} ca khuya`}
            title="Số lần tan ca sau 22:00 trong 30 ngày"
          />
          <SignalPill
            icon={<CalendarDays className="size-3" />}
            label={`${signals.daysOff7} ngày nghỉ / 7n`}
            title="Số ngày nghỉ trong 7 ngày qua"
          />
        </div>

        {/* Reasons */}
        {reasons.length > 0 ? (
          <details className="group/details rounded-lg border bg-muted/30 px-3 py-2 text-sm open:bg-muted/50">
            <summary className="cursor-pointer select-none font-medium text-foreground marker:hidden">
              Lý do{" "}
              <span className="text-xs text-muted-foreground">
                ({reasons.length})
              </span>
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </details>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            Không phát hiện tín hiệu cảnh báo nào.
          </div>
        )}

        {/* Recommendation */}
        <div
          className={cn(
            "rounded-lg border px-3 py-2.5 text-sm",
            levelRecommendationBox(riskLevel),
          )}
        >
          <div className="flex items-start gap-2">
            <HeartHandshake className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">Đề xuất:</span>{" "}
              {recommendationVi}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function SignalPill({
  icon,
  label,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/80"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="tabular-nums">{label}</span>
    </span>
  );
}
