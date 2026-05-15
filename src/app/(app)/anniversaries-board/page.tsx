import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Cake,
  Calendar,
  Crown,
  Gem,
  Gift,
  PartyPopper,
  Sparkles,
  Star,
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { KPIStat } from "@/components/kpi-stat";
import { LiveCounter } from "@/components/live-counter";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AnniversaryItem = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  hiredIso: string;
  yearsCompleting: number;
  nextAnniversaryIso: string;
  daysUntil: number;
  milestone: boolean;
  badgeLabel: string;
  monthsTenure: number;
};

type AnniversaryResponse = {
  ok: true;
  generatedAt: string;
  windowDays: number;
  windowStartIso: string;
  windowEndIso: string;
  summary: {
    totalEmployees: number;
    upcomingCount: number;
    milestoneCount: number;
    averageTenureMonths: number;
  };
  next: AnniversaryItem | null;
  items: AnniversaryItem[];
};

async function fetchAnniversaries(): Promise<AnniversaryResponse | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  try {
    const res = await fetch(`${base}/api/anniversaries?days=90`, {
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
    return data as AnniversaryResponse;
  } catch {
    return null;
  }
}

function fmtVnDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function milestoneIcon(years: number): React.ReactElement {
  if (years >= 20) return <Crown className="size-5" />;
  if (years >= 10) return <Gem className="size-5" />;
  if (years >= 5) return <Trophy className="size-5" />;
  if (years >= 3) return <Award className="size-5" />;
  return <Star className="size-5" />;
}

function milestoneGradient(years: number): string {
  if (years >= 20) return "from-purple-500 via-fuchsia-500 to-rose-500";
  if (years >= 15) return "from-amber-500 via-orange-500 to-red-500";
  if (years >= 10) return "from-cyan-500 via-blue-500 to-indigo-600";
  if (years >= 7) return "from-emerald-500 via-teal-500 to-cyan-500";
  if (years >= 5) return "from-amber-400 via-yellow-500 to-amber-600";
  if (years >= 3) return "from-violet-500 to-purple-600";
  if (years >= 2) return "from-blue-500 to-sky-500";
  return "from-emerald-500 to-green-600";
}

function daysUntilLabel(d: number): string {
  if (d === 0) return "Hôm nay!";
  if (d === 1) return "Ngày mai";
  if (d < 7) return `${d} ngày nữa`;
  if (d < 14) return `${d} ngày (≈ 1 tuần)`;
  if (d < 30) return `${d} ngày (≈ ${Math.round(d / 7)} tuần)`;
  return `${d} ngày (≈ ${Math.round(d / 30)} tháng)`;
}

function tenureLabel(months: number): string {
  if (months < 12) return `${months} tháng`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} năm`;
  return `${years} năm ${rem} tháng`;
}

function AnniversaryCard({ item }: { item: AnniversaryItem }) {
  const gradient = milestoneGradient(item.yearsCompleting);
  const isImminent = item.daysUntil <= 7;
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition",
        item.milestone && "border-amber-400/60 shadow-md",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
          gradient,
        )}
        aria-hidden
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "size-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white shrink-0 shadow-sm",
                gradient,
              )}
            >
              {milestoneIcon(item.yearsCompleting)}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{item.name}</CardTitle>
              <CardDescription className="text-xs">
                {item.role}
              </CardDescription>
            </div>
          </div>
          {item.milestone && (
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shrink-0">
              <Sparkles className="size-3 mr-1" />
              Mốc
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-4xl font-bold tabular-nums bg-gradient-to-br bg-clip-text text-transparent",
              gradient,
            )}
          >
            {item.yearsCompleting}
          </span>
          <span className="text-sm text-muted-foreground">
            năm gắn bó · {item.badgeLabel}
          </span>
        </div>

        <div
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium",
            isImminent
              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
              : "bg-muted/50 text-foreground",
          )}
        >
          <Calendar className="inline size-4 mr-1 -mt-0.5" />
          {fmtVnDate(item.nextAnniversaryIso)} · {daysUntilLabel(item.daysUntil)}
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <dt>Vào làm</dt>
            <dd className="text-foreground font-medium">
              {fmtVnDate(item.hiredIso)}
            </dd>
          </div>
          <div>
            <dt>Thâm niên</dt>
            <dd className="text-foreground font-medium">
              {tenureLabel(item.monthsTenure)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export default async function AnniversariesBoardPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const data = await fetchAnniversaries();

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <EmptyState
          variant="card"
          size="lg"
          icon={<PartyPopper className="size-12 text-muted-foreground" />}
          title="Không tải được dữ liệu kỷ niệm"
          description="Có lỗi khi gọi API /api/anniversaries. Hãy thử lại sau."
          action={
            <Button asChild>
              <Link href="">Thử lại</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { summary, items, next } = data;
  const milestonesFirst = [...items].sort((a, b) => {
    if (a.milestone !== b.milestone) return a.milestone ? -1 : 1;
    return a.daysUntil - b.daysUntil;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <Card className="border-amber-300/50 bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 dark:from-amber-950/20 dark:via-rose-950/20 dark:to-purple-950/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md">
                <Cake className="size-7" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Bảng kỷ niệm gắn bó
                </CardTitle>
                <CardDescription>
                  Những cột mốc đáng nhớ của đội ngũ trong 90 ngày tới
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/employees">
                <Users className="size-4 mr-2" />
                Danh sách nhân viên
              </Link>
            </Button>
          </div>
        </CardHeader>
        {next && (
          <CardContent>
            <div className="rounded-lg border bg-card/70 backdrop-blur p-4 flex items-center gap-4">
              <Gift className="size-10 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Người gần nhất
                </div>
                <div className="text-lg font-semibold truncate">
                  {next.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {next.yearsCompleting} năm
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {fmtVnDate(next.nextAnniversaryIso)} ·{" "}
                  {daysUntilLabel(next.daysUntil)}
                </div>
              </div>
              <Badge
                className={cn(
                  "bg-gradient-to-r text-white border-0 hidden sm:inline-flex",
                  milestoneGradient(next.yearsCompleting),
                )}
              >
                {next.badgeLabel}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPIStat
          label="Tổng nhân viên"
          value={<LiveCounter to={summary.totalEmployees} />}
          icon={<Users className="size-4" />}
          variant="default"
        />
        <KPIStat
          label="Kỷ niệm sắp tới"
          value={<LiveCounter to={summary.upcomingCount} />}
          hint="trong 90 ngày"
          icon={<Calendar className="size-4" />}
          variant="accent"
        />
        <KPIStat
          label="Mốc đặc biệt"
          value={<LiveCounter to={summary.milestoneCount} />}
          hint="1·2·3·5·7·10·15·20·25 năm"
          icon={<Trophy className="size-4 text-amber-500" />}
          variant="elevated"
        />
        <KPIStat
          label="Thâm niên TB"
          value={tenureLabel(Math.round(summary.averageTenureMonths))}
          icon={<Sparkles className="size-4" />}
          variant="subtle"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          variant="card"
          size="md"
          icon={<Cake className="size-12 text-muted-foreground" />}
          title="Không có kỷ niệm trong 90 ngày tới"
          description="Hãy quay lại sau, hoặc kéo dài khoảng thời gian để xem thêm."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestonesFirst.map((item) => (
            <AnniversaryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
