import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Flame,
  Heart,
  Link2,
  Lock,
  Sparkles,
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
import { LiveCounter } from "@/components/live-counter";
import { TimeAgo } from "@/components/time-ago";
import { EmptyState } from "@/components/empty-state";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { StreakGrid, type StreakGridPoint } from "./streak-grid";

export const dynamic = "force-dynamic";

type StreakResponse = {
  ok: true;
  asOf: string;
  employee: { id: number; name: string; role: string } | null;
  current: {
    days: number;
    startIso: string | null;
    lastWorkedIso: string | null;
  };
  longest: {
    days: number;
    startIso: string | null;
    endIso: string | null;
  };
  last30: {
    daysWorked: number;
    totalHours: number;
    averageHoursPerWorkedDay: number;
    activityPoints: StreakGridPoint[];
  };
  kudos: {
    totalLast30: number;
    fromUnique: number;
  };
  upcomingShifts: number;
  badges: { code: string; label: string; earned: boolean; tooltip: string }[];
};

async function fetchStreak(): Promise<StreakResponse> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  const res = await fetch(`${base}/api/me/streak`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) {
    throw new Error(`Streak API trả về HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Phản hồi streak không hợp lệ");
  }
  return data as StreakResponse;
}

function flameSizeClass(days: number): string {
  if (days <= 0) return "size-10 text-muted-foreground";
  if (days < 3) return "size-12 text-amber-400";
  if (days < 7) return "size-16 text-orange-500";
  if (days < 14) return "size-20 text-orange-600";
  if (days < 30) return "size-24 text-rose-500";
  return "size-28 text-rose-600 drop-shadow-[0_0_18px_rgba(244,63,94,0.5)]";
}

function formatIsoShort(iso: string | null): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const metadata = {
  title: "Chuỗi làm việc — Cafe HR",
};

export default async function StreakPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await fetchStreak();

  if (!data.employee) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <Badge variant="outline" className="w-fit gap-1">
            <Flame className="size-3" /> Chuỗi làm việc
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Chuỗi làm việc của bạn
          </h1>
        </header>
        <EmptyState
          icon={<Link2 style={{ width: 36, height: 36 }} />}
          title="Chưa liên kết nhân viên"
          description="Tài khoản của bạn chưa được liên kết với một hồ sơ nhân viên. Hãy liên kết để theo dõi chuỗi ngày làm việc, kudos và huy hiệu."
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
    employee,
    current,
    longest,
    last30,
    kudos,
    upcomingShifts,
    badges,
  } = data;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-orange-100 via-background to-rose-100/70 p-6 dark:from-orange-950/30 dark:via-background dark:to-rose-950/20 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit gap-1">
              <Flame className="size-3" /> Chuỗi làm việc
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Xin chào,{" "}
              <span className="text-primary">{employee.name}</span>!
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Theo dõi nhịp độ làm việc, huy hiệu và lời cảm ơn từ đồng đội. Mỗi
              ngày bạn xuất hiện đều được hệ thống ghi nhận.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border bg-card/70 px-6 py-5 shadow-sm backdrop-blur">
            <Flame
              aria-hidden
              className={cn("shrink-0 transition-all", flameSizeClass(current.days))}
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chuỗi hiện tại
              </p>
              <p className="text-5xl font-bold leading-none tabular-nums text-foreground">
                <LiveCounter to={current.days} duration={900} />
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  ngày
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Trophy className="size-3.5 text-amber-500" />
                  Kỷ lục:{" "}
                  <span className="font-semibold text-foreground">
                    {longest.days} ngày
                  </span>
                  {longest.endIso ? (
                    <span className="text-muted-foreground/80">
                      (tới {formatIsoShort(longest.endIso)})
                    </span>
                  ) : null}
                </span>
                {current.lastWorkedIso ? (
                  <span className="inline-flex items-center gap-1">
                    · Lần cuối:{" "}
                    <TimeAgo
                      iso={`${current.lastWorkedIso}T00:00:00`}
                      withPrefix
                    />
                  </span>
                ) : (
                  <span className="text-muted-foreground/70">
                    · Chưa có ngày làm việc gần đây
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Ngày có làm (30 ngày)"
          value={
            <LiveCounter to={last30.daysWorked} duration={700} />
          }
          sublabel={`${last30.daysWorked} / 30 ngày`}
          tone="primary"
        />
        <StatCard
          icon={Sparkles}
          label="Tổng giờ (30 ngày)"
          value={
            <LiveCounter
              to={last30.totalHours}
              duration={900}
              decimals={1}
            />
          }
          sublabel="giờ"
          tone="accent"
        />
        <StatCard
          icon={Trophy}
          label="Giờ TB / ngày làm"
          value={
            <LiveCounter
              to={last30.averageHoursPerWorkedDay}
              duration={900}
              decimals={1}
            />
          }
          sublabel="giờ / ngày"
          tone="secondary"
        />
        <StatCard
          icon={Heart}
          label="Kudos nhận được"
          value={<LiveCounter to={kudos.totalLast30} duration={700} />}
          sublabel={
            kudos.fromUnique > 0
              ? `Từ ${kudos.fromUnique} đồng đội khác nhau`
              : "Chưa có kudos trong 30 ngày qua"
          }
          tone="primary"
        />
      </section>

      {/* Activity grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Hoạt động 30 ngày gần nhất
          </CardTitle>
          <CardDescription>
            Mỗi ô là một ngày — màu càng đậm bạn càng làm nhiều giờ. Di chuột để
            xem chi tiết.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StreakGrid points={last30.activityPoints} />
        </CardContent>
      </Card>

      {/* Badges grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4" /> Huy hiệu
          </CardTitle>
          <CardDescription>
            {badges.filter((b) => b.earned).length} / {badges.length} huy hiệu
            đã đạt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((b) => (
              <li
                key={b.code}
                title={b.tooltip}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl border p-3 text-sm shadow-sm transition-all",
                  b.earned
                    ? "border-amber-300/60 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30"
                    : "border-dashed bg-muted/30 opacity-40 grayscale",
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    b.earned ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {b.earned ? (
                    <Trophy className="size-5" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight">
                    {b.label}
                  </p>
                  <p
                    className={cn(
                      "truncate text-xs",
                      b.earned ? "text-white/90" : "text-muted-foreground",
                    )}
                  >
                    {b.tooltip}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Upcoming shifts hint */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {upcomingShifts > 0 ? (
                  <>
                    Bạn có{" "}
                    <span className="font-bold text-primary">
                      {upcomingShifts}
                    </span>{" "}
                    ca trong 7 ngày tới — giữ vững phong độ!
                  </>
                ) : (
                  <>Chưa có ca nào được xếp trong 7 ngày tới.</>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Mỗi ngày bạn check-in đều cộng vào chuỗi.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/shifts">
              Xem lịch ca <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
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
          <Icon className="size-6" />
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
