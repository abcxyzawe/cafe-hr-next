import { redirect } from "next/navigation";
import { Sparkles, Trophy, Award, Heart, Clock, Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import { getCachedEotd, type EotdCandidate } from "@/lib/eotd-data";
import { RefreshEotdButton } from "./refresh-button";
import { PrintEotdButton } from "./print-button";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-amber-900 backdrop-blur dark:bg-white/10 dark:text-amber-100">
      <Icon className="size-3.5" />
      <span className="font-medium">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function RunnerRow({ c, rank }: { c: EotdCandidate; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground">
        {rank}
      </span>
      <Avatar
        src={c.avatarUrl ?? undefined}
        fallback={c.name}
        role={c.role}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{c.name}</p>
        <p className="text-xs text-muted-foreground">{c.role}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">{c.score}</p>
        <p className="text-[10px] text-muted-foreground">điểm</p>
      </div>
    </div>
  );
}

export default async function EmployeeOfTheDayPage() {
  const sess = await getSession();
  if (sess?.role !== "admin") redirect("/");

  const now = new Date();
  const cached = getCachedEotd(now);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #eotd-card, #eotd-card * { visibility: visible !important; }
          #eotd-card {
            position: absolute !important;
            left: 0; top: 0;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .eotd-no-print { display: none !important; }
        }
      `}</style>

      <Card className="eotd-no-print">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              <div>
                <CardTitle>Nhân viên của ngày</CardTitle>
                <CardDescription>
                  Chọn ra ngôi sao tỏa sáng nhất hôm nay dựa trên giờ làm,
                  streak, lời khen và tỉ lệ đúng giờ.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {cached ? <PrintEotdButton /> : null}
              <RefreshEotdButton hasResult={cached !== null} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {cached ? (
        <>
          <div
            id="eotd-card"
            className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 p-8 shadow-lg dark:border-amber-900/50 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-rose-950/40"
          >
            <div className="absolute -right-10 -top-10 size-48 rounded-full bg-amber-300/30 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 size-48 rounded-full bg-rose-300/30 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-3 flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 backdrop-blur dark:bg-white/10 dark:text-amber-200">
                <Award className="size-4" />
                Nhân viên của ngày · {formatDate(cached.generatedAt)}
              </div>

              <div className="mb-4 rounded-full ring-4 ring-amber-300 ring-offset-4 ring-offset-amber-100 dark:ring-offset-amber-950/40">
                <Avatar
                  src={cached.winner.avatarUrl ?? undefined}
                  fallback={cached.winner.name}
                  role={cached.winner.role}
                  size={96}
                />
              </div>

              <h2 className="mb-1 text-3xl font-bold text-amber-950 dark:text-amber-50">
                {cached.winner.name}
              </h2>
              <Badge variant="warning" className="mb-4">
                {cached.winner.role}
              </Badge>

              <p className="mb-1 text-xs uppercase tracking-wider text-amber-800/80 dark:text-amber-200/80">
                Điểm số
              </p>
              <p
                className="mb-5 text-6xl font-black tabular-nums"
                style={{
                  background:
                    "linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {cached.winner.score}
              </p>

              <div className="mb-5 flex flex-wrap justify-center gap-2">
                <StatChip
                  icon={Clock}
                  label="Giờ tháng"
                  value={cached.winner.monthHours}
                />
                <StatChip
                  icon={Flame}
                  label="Streak"
                  value={cached.winner.streak}
                />
                <StatChip
                  icon={Heart}
                  label="Khen"
                  value={cached.winner.kudosCount}
                />
              </div>

              <blockquote className="max-w-xl border-l-4 border-amber-400 bg-white/60 px-4 py-3 text-left text-sm italic leading-relaxed text-amber-950 backdrop-blur dark:bg-white/5 dark:text-amber-50">
                {cached.message}
              </blockquote>

              <p className="mt-4 text-[11px] text-amber-700/70 dark:text-amber-200/60">
                Tạo lúc {formatTime(cached.generatedAt)} ·{" "}
                {formatDate(cached.generatedAt)}
              </p>
            </div>
          </div>

          {cached.runnersUp.length > 0 ? (
            <Card className="eotd-no-print">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-500" />
                  <div>
                    <CardTitle>Cũng rất xuất sắc</CardTitle>
                    <CardDescription>
                      4 nhân viên có điểm số cao tiếp theo
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cached.runnersUp.map((c, i) => (
                    <RunnerRow key={c.employeeId} c={c} rank={i + 2} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <Card className="eotd-no-print">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Trophy className="size-10 text-amber-400" />
            <p className="text-sm text-muted-foreground">
              Chưa có nhân viên của ngày hôm nay. Bấm{" "}
              <span className="font-medium">Chọn nhân viên của ngày</span> phía
              trên để AI vinh danh ngôi sao của hôm nay.
            </p>
            <p className="text-xs text-muted-foreground">
              Công thức điểm: giờ tháng + (streak × 5) + (khen × 10) − (đi
              muộn × 8)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
