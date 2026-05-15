import { redirect } from "next/navigation";
import {
  Sparkles,
  CalendarDays,
  UserCheck,
  Clock3,
  AlarmClock,
  CalendarCheck2,
  Cake,
  ThumbsUp,
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
  gatherSuggesterFacts,
  type SuggesterFacts,
} from "@/lib/task-suggest-data";
import { SuggesterBoard } from "./suggester-board";

export const dynamic = "force-dynamic";

type Tile = {
  label: string;
  value: number;
  icon: typeof Sparkles;
  hint: string;
  tone: "today" | "alert" | "warm";
};

function buildTiles(facts: SuggesterFacts): Tile[] {
  return [
    {
      label: "Ca làm hôm nay",
      value: facts.shiftsToday,
      icon: CalendarDays,
      hint: "Tổng ca đã xếp cho hôm nay",
      tone: "today",
    },
    {
      label: "Lượt chấm công hôm nay",
      value: facts.attendanceTodayCount,
      icon: UserCheck,
      hint: "Số lần check-in trong hôm nay",
      tone: "today",
    },
    {
      label: "Quên check-out",
      value: facts.openAttendance,
      icon: Clock3,
      hint: "Còn mở từ hôm qua",
      tone: "alert",
    },
    {
      label: "Task quá hạn",
      value: facts.overdueTasksCount,
      icon: AlarmClock,
      hint: "Chưa hoàn thành, đã qua hạn",
      tone: "alert",
    },
    {
      label: "Đơn nghỉ chờ duyệt",
      value: facts.pendingLeavesCount,
      icon: CalendarCheck2,
      hint: "Đang chờ admin xử lý",
      tone: "alert",
    },
    {
      label: "Sinh nhật hôm nay",
      value: facts.birthdaysToday,
      icon: Cake,
      hint: "Nhân viên có sinh nhật hôm nay",
      tone: "warm",
    },
  ];
}

const TONE_STYLES: Record<Tile["tone"], string> = {
  today:
    "bg-emerald-500/10 ring-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  alert:
    "bg-amber-500/10 ring-amber-500/30 text-amber-700 dark:text-amber-300",
  warm: "bg-pink-500/10 ring-pink-500/30 text-pink-700 dark:text-pink-300",
};

export default async function TaskSuggestPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const facts = await gatherSuggesterFacts();
  const tiles = buildTiles(facts);

  // Total employees across roles for the header summary
  const totalEmployees = Object.values(facts.employeesByRole).reduce(
    (a, b) => a + b,
    0,
  );
  const recentKudos = facts.recentKudosCount;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-background">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-indigo-500" />
            AI gợi ý task thông minh
          </CardTitle>
          <CardDescription>
            Dựa vào số liệu hôm nay (ca làm, chấm công, đơn nghỉ, task quá hạn,
            sinh nhật, ghi nhận gần đây), AI sẽ đề xuất 5 đầu việc cụ thể, vừa
            sức một ca làm. Bấm nút bên dưới để tạo gợi ý.
          </CardDescription>
          <div className="pt-2 text-xs text-muted-foreground">
            Tổng nhân viên: <span className="font-medium tabular-nums">{totalEmployees}</span>
            {" · "}
            Ghi nhận 7 ngày qua:{" "}
            <span className="inline-flex items-center gap-1 font-medium tabular-nums">
              <ThumbsUp className="size-3" /> {recentKudos}
            </span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

      <SuggesterBoard initialFacts={facts} />
    </div>
  );
}
