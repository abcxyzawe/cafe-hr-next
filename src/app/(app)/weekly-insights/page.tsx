import { redirect } from "next/navigation";
import {
  Sparkles,
  Clock,
  CalendarDays,
  CheckCircle2,
  Heart,
  Plane,
  Trophy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  gatherWeeklyFacts,
  getCachedInsights,
  weekKey,
  type WeeklyFacts,
} from "@/lib/weekly-insights-data";
import { RefreshInsightsButton } from "./refresh-button";

export const dynamic = "force-dynamic";

type StatTile = {
  key: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

function buildTiles(facts: WeeklyFacts): StatTile[] {
  return [
    {
      key: "hours",
      label: "Tổng giờ làm",
      value: `${facts.totalHours.toLocaleString("vi-VN")} giờ`,
      icon: Clock,
      accent:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    {
      key: "shifts",
      label: "Tổng số ca",
      value: facts.totalShifts.toLocaleString("vi-VN"),
      icon: CalendarDays,
      accent:
        "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    },
    {
      key: "attendance",
      label: "Tỉ lệ đi làm",
      value: `${facts.attendanceRate}%`,
      icon: CheckCircle2,
      accent:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    {
      key: "kudos",
      label: "Lời khen đã trao",
      value: facts.kudosCount.toLocaleString("vi-VN"),
      icon: Heart,
      accent:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    },
    {
      key: "leaves",
      label: "Đơn nghỉ đã xử lý",
      value: facts.leavesProcessed.toLocaleString("vi-VN"),
      icon: Plane,
      accent:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    },
  ];
}

function formatGeneratedAt(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} ${dd}/${mo}`;
}

export default async function WeeklyInsightsPage() {
  const sess = await getSession();
  if (sess?.role !== "admin") redirect("/");

  const now = new Date();
  let facts: WeeklyFacts | null = null;
  let factsError: string | null = null;
  try {
    facts = await gatherWeeklyFacts(now);
  } catch (e) {
    factsError = e instanceof Error ? e.message : String(e);
  }

  const cached = getCachedInsights(weekKey(now));

  // Pull avatars for the top performers (best-effort)
  let avatarMap = new Map<number, string | null>();
  let roleMap = new Map<number, string>();
  if (facts && facts.topPerformers.length > 0) {
    try {
      const rows = await prisma.employee.findMany({
        where: { id: { in: facts.topPerformers.map((p) => p.employeeId) } },
        select: { id: true, avatarUrl: true, role: true },
      });
      avatarMap = new Map(rows.map((r) => [r.id, r.avatarUrl]));
      roleMap = new Map(rows.map((r) => [r.id, r.role as string]));
    } catch {
      avatarMap = new Map();
      roleMap = new Map();
    }
  }

  const paragraphs = cached
    ? cached.content
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  const tiles = facts ? buildTiles(facts) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              <div>
                <CardTitle>Tóm tắt tuần</CardTitle>
                <CardDescription>
                  {facts
                    ? `Tuần ${facts.weekRange} · cập nhật cuối tuần để nhìn lại 7 ngày qua`
                    : "Chưa thể đọc dữ liệu tuần"}
                </CardDescription>
              </div>
            </div>
            <RefreshInsightsButton hasInsights={cached !== null} />
          </div>
        </CardHeader>
      </Card>

      {factsError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {factsError}
          </CardContent>
        </Card>
      ) : facts ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.key}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <span
                      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md ${t.accent}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t.label}
                      </p>
                      <p className="truncate text-lg font-semibold">
                        {t.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="size-5 text-amber-500" />
                  <div>
                    <CardTitle>Top nhân viên</CardTitle>
                    <CardDescription>
                      Tổng giờ làm cao nhất trong tuần
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {facts.topPerformers.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    Tuần này chưa có giờ làm được ghi nhận.
                  </p>
                ) : (
                  facts.topPerformers.map((p, idx) => (
                    <div
                      key={p.employeeId}
                      className="flex items-center gap-3 rounded-md border bg-muted/30 p-3"
                    >
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <Avatar
                        src={avatarMap.get(p.employeeId) ?? undefined}
                        fallback={p.name}
                        role={roleMap.get(p.employeeId)}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.hours.toLocaleString("vi-VN")} giờ
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-500" />
                  <div>
                    <CardTitle>AI nhận xét tuần</CardTitle>
                    <CardDescription>
                      {cached
                        ? `Tạo lúc ${formatGeneratedAt(cached.generatedAt)} · ${facts.weekRange}`
                        : "Bấm Tạo tóm tắt tuần để Grok phân tích các con số"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cached ? (
                  <div className="space-y-3 rounded-md border bg-muted/40 p-4 text-sm leading-relaxed">
                    {paragraphs.length > 0 ? (
                      paragraphs.map((p, i) => <p key={i}>{p}</p>)
                    ) : (
                      <p>{cached.content}</p>
                    )}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    Chưa có tóm tắt cho tuần {facts.weekRange}. Bấm
                    &ldquo;Tạo tóm tắt tuần&rdquo; phía trên để AI tạo một đoạn
                    nhận xét ngắn (Tổng quan / Điểm sáng / Cần lưu ý) dựa trên
                    các con số bên trên.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
