import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Crown,
  Flame,
  Heart,
  Layers,
  Medal,
  Trophy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { TimeAgo } from "@/components/time-ago";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bảng xếp hạng — Cafe HR",
};

type Period = "week" | "month" | "quarter" | "year";

type CategoryKey =
  | "mostKudos"
  | "mostHours"
  | "mostTasksCompleted"
  | "bestShiftAttendance"
  | "longestStreak"
  | "mostShiftCoverage";

type EmployeeRef = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type Row = {
  rank: number;
  employee: EmployeeRef;
  value: number;
  displayValue: string;
  secondary?: string;
};

type Champion = {
  id: number;
  name: string;
  role: string;
  titles: string[];
};

type LeaderboardsResponse = {
  ok: true;
  generatedAt: string;
  period: Period;
  periodStartIso: string;
  periodEndIso: string;
  champion: Champion | null;
  categories: Record<CategoryKey, Row[]>;
};

const PERIODS: ReadonlyArray<Period> = ["week", "month", "quarter", "year"];

const PERIOD_LABEL_VI: Record<Period, string> = {
  week: "Tuần",
  month: "Tháng",
  quarter: "Quý",
  year: "Năm",
};

const PERIOD_HEADER_VI: Record<Period, string> = {
  week: "Bảng xếp hạng tuần",
  month: "Bảng xếp hạng tháng",
  quarter: "Bảng xếp hạng quý",
  year: "Bảng xếp hạng năm",
};

const CATEGORY_KEYS: ReadonlyArray<CategoryKey> = [
  "mostKudos",
  "mostHours",
  "mostTasksCompleted",
  "bestShiftAttendance",
  "longestStreak",
  "mostShiftCoverage",
];

type CategoryMeta = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  mostKudos: {
    title: "Lời khen",
    description: "Nhân viên nhận được nhiều lời khen nhất",
    icon: Heart,
    accent: "text-rose-500",
  },
  mostHours: {
    title: "Giờ làm",
    description: "Tổng số giờ làm việc nhiều nhất",
    icon: Clock,
    accent: "text-sky-500",
  },
  mostTasksCompleted: {
    title: "Việc hoàn thành",
    description: "Hoàn thành nhiều công việc nhất",
    icon: CheckCircle,
    accent: "text-emerald-500",
  },
  bestShiftAttendance: {
    title: "Tỷ lệ đi ca",
    description: "Tỷ lệ đi ca cao nhất trên lịch xếp",
    icon: Calendar,
    accent: "text-indigo-500",
  },
  longestStreak: {
    title: "Chuỗi liên tiếp",
    description: "Chuỗi ngày làm việc liên tiếp dài nhất",
    icon: Flame,
    accent: "text-orange-500",
  },
  mostShiftCoverage: {
    title: "Phủ ca",
    description: "Nhận và phủ nhiều ca làm nhất",
    icon: Layers,
    accent: "text-violet-500",
  },
};

function parsePeriod(raw: string | undefined): Period {
  if (
    raw === "week" ||
    raw === "month" ||
    raw === "quarter" ||
    raw === "year"
  ) {
    return raw;
  }
  return "month";
}

function formatIsoDateVi(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0].length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first}${last}`.toUpperCase();
}

async function fetchLeaderboards(
  period: Period,
): Promise<LeaderboardsResponse> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  const res = await fetch(`${base}/api/leaderboards?period=${period}`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) {
    throw new Error(`Leaderboards API trả về HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Phản hồi leaderboards không hợp lệ");
  }
  return data as LeaderboardsResponse;
}

type SearchParamsBag = { period?: string | string[] };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsBag>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");

  const sp = await searchParams;
  const rawPeriod = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = parsePeriod(rawPeriod);

  const data = await fetchLeaderboards(period);

  const periodStartLabel = formatIsoDateVi(data.periodStartIso);
  const periodEndLabel = formatIsoDateVi(data.periodEndIso);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-200 via-orange-300 to-rose-400 p-6 text-white shadow-md dark:from-amber-500/40 dark:via-orange-600/40 dark:to-rose-700/40 md:p-8">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <Badge
              variant="outline"
              className="w-fit gap-1 border-white/40 bg-white/10 text-white backdrop-blur"
            >
              <Trophy className="size-3" /> Bảng vinh danh
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight drop-shadow-sm md:text-4xl">
              {PERIOD_HEADER_VI[period]}
            </h1>
            <p className="max-w-2xl text-sm text-white/90">
              Vinh danh những nhân viên có thành tích nổi bật từ{" "}
              <span className="font-semibold">{periodStartLabel}</span> đến{" "}
              <span className="font-semibold">{periodEndLabel}</span>. Mỗi hạng
              mục lấy top 10 trong khoảng thời gian đã chọn.
            </p>
          </div>
          <div className="hidden shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15 p-5 backdrop-blur md:flex">
            <Trophy
              aria-hidden
              className="size-20 text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.5)]"
            />
          </div>
        </div>

        {/* Period switcher */}
        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => {
            const active = p === period;
            return (
              <Link
                key={p}
                href={`/leaderboard?period=${p}`}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-all",
                  active
                    ? "bg-white text-orange-600 shadow"
                    : "border border-white/40 bg-white/10 text-white hover:bg-white/20",
                )}
                aria-current={active ? "page" : undefined}
              >
                {PERIOD_LABEL_VI[p]}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Champion spotlight */}
      {data.champion ? (
        <ChampionCard champion={data.champion} />
      ) : (
        <EmptyState
          icon={<Crown style={{ width: 36, height: 36 }} />}
          title="Chưa có quán quân tổng hợp"
          description="Cần ít nhất một hạng mục có người dẫn đầu để chọn quán quân kỳ này."
          variant="card"
          size="md"
        />
      )}

      {/* Categories grid */}
      <section className="grid gap-4 md:grid-cols-2">
        {CATEGORY_KEYS.map((key) => (
          <CategoryCard
            key={key}
            meta={CATEGORY_META[key]}
            rows={data.categories[key]}
          />
        ))}
      </section>

      {/* Footer note */}
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>Cập nhật</span>
        <TimeAgo iso={data.generatedAt} withPrefix />
        <span>·</span>
        <span>
          Khoảng thời gian: {periodStartLabel} – {periodEndLabel}
        </span>
      </p>
    </div>
  );
}

function ChampionCard({ champion }: { champion: Champion }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 p-6 text-white shadow-lg dark:from-yellow-500/50 dark:via-amber-600/50 dark:to-orange-700/50 md:p-8">
      <div className="absolute -left-8 -top-8 size-40 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-12 -right-10 size-56 rounded-full bg-rose-500/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-6">
        <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-inner backdrop-blur md:size-28">
          <Crown
            aria-hidden
            className="size-12 text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.8)] md:size-14"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
            Quán quân tổng hợp
          </p>
          <h2 className="text-3xl font-extrabold leading-tight drop-shadow-sm md:text-4xl">
            {champion.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              {champion.role}
            </span>
            {champion.titles.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm"
              >
                <Award className="size-3" /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  meta,
  rows,
}: {
  meta: CategoryMeta;
  rows: Row[];
}) {
  const Icon = meta.icon;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg bg-muted",
              meta.accent,
            )}
          >
            <Icon className="size-4" />
          </span>
          <span>{meta.title}</span>
        </CardTitle>
        <CardDescription className="text-xs">
          {meta.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length === 0 ? (
          <EmptyState
            variant="subtle"
            size="sm"
            title="Chưa có dữ liệu"
            description="Không có thành tích nào được ghi nhận trong khoảng thời gian này."
          />
        ) : (
          <ol className="space-y-2">
            {rows.map((row) => (
              <LeaderRow key={`${row.rank}-${row.employee.id}`} row={row} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function rankPillClass(rank: number): string {
  if (rank === 1) {
    return "bg-gradient-to-br from-yellow-300 to-amber-500 text-white shadow";
  }
  if (rank === 2) {
    return "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 shadow";
  }
  if (rank === 3) {
    return "bg-gradient-to-br from-orange-300 to-amber-700 text-white shadow";
  }
  return "bg-muted text-muted-foreground";
}

function rankMedalTone(rank: number): string {
  if (rank === 1) return "text-amber-500";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-orange-600";
  return "text-muted-foreground";
}

function avatarBubbleClass(rank: number): string {
  if (rank <= 3) {
    return "bg-gradient-to-br from-amber-400 to-orange-500 text-white";
  }
  return "bg-muted text-foreground";
}

function LeaderRow({ row }: { row: Row }) {
  const isTop3 = row.rank <= 3;
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
        isTop3
          ? "border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
            rankPillClass(row.rank),
          )}
          aria-label={`Hạng ${row.rank}`}
        >
          {row.rank}
        </span>
        {isTop3 ? (
          <Medal
            aria-hidden
            className={cn("size-4 shrink-0", rankMedalTone(row.rank))}
          />
        ) : null}
      </div>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase",
          avatarBubbleClass(row.rank),
        )}
        aria-hidden
      >
        {initials(row.employee.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-semibold leading-tight",
            isTop3 ? "text-base" : "text-sm",
          )}
        >
          {row.employee.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center rounded-full border bg-background px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide">
            {row.employee.role}
          </span>
          {row.secondary ? (
            <span className="truncate">{row.secondary}</span>
          ) : null}
        </p>
      </div>
      <div
        className={cn(
          "shrink-0 text-right font-bold tabular-nums",
          isTop3 ? "text-lg" : "text-sm",
        )}
      >
        {row.displayValue}
      </div>
    </li>
  );
}
