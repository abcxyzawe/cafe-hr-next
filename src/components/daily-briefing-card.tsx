import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BriefingFacts, DailyBriefing } from "@/lib/daily-briefing";
import { DailyBriefingRefresh } from "@/components/daily-briefing-refresh";

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function FactChips({ facts }: { facts: BriefingFacts }) {
  const items: Array<{ label: string; value: number; tone?: "warning" | "success" | "secondary" }> = [
    { label: "Đơn nghỉ chờ", value: facts.pendingLeaves, tone: facts.pendingLeaves > 0 ? "warning" : "secondary" },
    { label: "Đang làm", value: facts.openAttendance, tone: "secondary" },
    { label: "Việc quá hạn", value: facts.overdueTasks, tone: facts.overdueTasks > 0 ? "warning" : "secondary" },
    { label: "Sinh nhật", value: facts.birthdaysToday, tone: facts.birthdaysToday > 0 ? "success" : "secondary" },
    { label: "Ca hôm nay", value: facts.shiftsToday, tone: "secondary" },
    { label: "Ca trống", value: facts.unfilledShiftSlots, tone: facts.unfilledShiftSlots > 0 ? "warning" : "secondary" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <Badge key={it.label} variant={it.tone ?? "secondary"} className="gap-1 font-medium">
          <span className="opacity-80">{it.label}</span>
          <span className="tabular-nums">{it.value}</span>
        </Badge>
      ))}
    </div>
  );
}

export function DailyBriefingCard({
  briefing,
  facts,
  isAdmin,
}: {
  briefing: DailyBriefing | null;
  facts: BriefingFacts;
  isAdmin: boolean;
}) {
  if (!isAdmin) return null;
  const display = briefing?.facts ?? facts;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          Tóm tắt hôm nay
        </CardTitle>
        <DailyBriefingRefresh />
      </CardHeader>
      <CardContent className="space-y-3">
        {briefing ? (
          <>
            <p className="text-sm leading-relaxed text-foreground">
              {briefing.content}
            </p>
            <p className="text-xs text-muted-foreground">
              tạo lúc {formatTime(briefing.generatedAt)}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Bấm Làm mới để tạo tóm tắt AI cho ngày hôm nay.
          </p>
        )}
        <FactChips facts={display} />
      </CardContent>
    </Card>
  );
}
