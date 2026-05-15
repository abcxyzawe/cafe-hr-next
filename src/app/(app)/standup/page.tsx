import { redirect } from "next/navigation";
import {
  Sunrise,
  CalendarCheck2,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  PlaneTakeoff,
  Clock3,
  AlarmClock,
  UserCheck,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import {
  gatherStandupFacts,
  getCachedStandup,
  type StandupFacts,
} from "@/lib/standup-data";
import { formatDateTime } from "@/lib/utils";
import { StandupRefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

type TileTone = "yesterday" | "today" | "alert";

type Tile = {
  label: string;
  value: number;
  icon: typeof Sunrise;
  tone: TileTone;
  hint: string;
};

function buildTiles(facts: StandupFacts): Tile[] {
  return [
    {
      label: "Đã chấm công hôm qua",
      value: facts.yesterday.checkins,
      icon: UserCheck,
      tone: "yesterday",
      hint: "Số nhân viên có check-in hôm qua",
    },
    {
      label: "Task đã hoàn thành",
      value: facts.yesterday.tasksCompleted,
      icon: CheckCircle2,
      tone: "yesterday",
      hint: "Đánh dấu xong trong ngày hôm qua",
    },
    {
      label: "Đơn nghỉ đã xử lý",
      value: facts.yesterday.leavesProcessed,
      icon: CalendarCheck2,
      tone: "yesterday",
      hint: "Duyệt hoặc từ chối hôm qua",
    },
    {
      label: "Ca làm hôm nay",
      value: facts.today.shiftsScheduled,
      icon: CalendarDays,
      tone: "today",
      hint: "Tổng số ca đã xếp cho hôm nay",
    },
    {
      label: "Task cần làm",
      value: facts.today.pendingTasks,
      icon: ListTodo,
      tone: "today",
      hint: "Đến hạn hôm nay hoặc trước đó",
    },
    {
      label: "Nghỉ phép sắp tới",
      value: facts.today.upcomingLeaves,
      icon: PlaneTakeoff,
      tone: "today",
      hint: "Đơn duyệt bắt đầu trong 7 ngày tới",
    },
  ];
}

const TONE_STYLES: Record<TileTone, string> = {
  yesterday: "bg-sky-500/10 ring-sky-500/30 text-sky-700 dark:text-sky-300",
  today: "bg-emerald-500/10 ring-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  alert: "bg-amber-500/10 ring-amber-500/30 text-amber-700 dark:text-amber-300",
};

function formatBriefingParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export default async function StandupPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const today = new Date();
  const cached = getCachedStandup(today);
  const facts = cached?.facts ?? (await gatherStandupFacts(today));

  const tiles = buildTiles(facts);
  const alerts = facts.alerts;
  const totalAlerts =
    alerts.overdueTasks + alerts.pendingLeaves + alerts.openAttendance;

  const paragraphs = cached ? formatBriefingParagraphs(cached.content) : [];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-background">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sunrise className="size-5 text-amber-500" />
              Standup buổi sáng
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
              <span>Briefing AI tổng hợp cho cuộc họp đầu ngày</span>
              {cached ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  Cập nhật {formatDateTime(cached.generatedAt)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  Chưa có briefing — bấm Làm mới để tạo
                </span>
              )}
            </CardDescription>
          </div>
          <StandupRefreshButton />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label} className="overflow-hidden">
              <CardContent className="flex items-start gap-3 pt-6">
                <div
                  className={`grid size-10 place-items-center rounded-md ring-1 ${TONE_STYLES[t.tone]}`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {t.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.hint}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            Cần chú ý
            {totalAlerts > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {totalAlerts}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AlertTile
              icon={AlarmClock}
              label="Task quá hạn"
              value={alerts.overdueTasks}
            />
            <AlertTile
              icon={CalendarCheck2}
              label="Đơn nghỉ chờ duyệt"
              value={alerts.pendingLeaves}
            />
            <AlertTile
              icon={Clock3}
              label="Quên check-out"
              value={alerts.openAttendance}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Briefing AI
          </CardTitle>
          <CardDescription>
            Tóm tắt 3 phần do AI viết, dùng cho họp đầu ca buổi sáng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paragraphs.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có briefing cho hôm nay. Bấm{" "}
              <span className="font-medium text-foreground">
                Làm mới briefing
              </span>{" "}
              ở phía trên để AI tổng hợp dựa trên các con số bên trên.
            </div>
          ) : (
            <div className="space-y-3 leading-relaxed">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm">
                  {p}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AlertTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AlarmClock;
  label: string;
  value: number;
}): React.ReactElement {
  const isHot = value > 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
        isHot
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-muted/30"
      }`}
    >
      <div
        className={`grid size-9 place-items-center rounded-md ring-1 ${
          isHot
            ? "bg-amber-500/15 ring-amber-500/30 text-amber-700 dark:text-amber-300"
            : "bg-muted ring-border text-muted-foreground"
        }`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
