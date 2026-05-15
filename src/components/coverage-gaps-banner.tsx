import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SHIFT_LABELS, cn } from "@/lib/utils";
import type { CoverageGap } from "@/lib/coverage-gaps";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

function formatDayLabel(iso: string): string {
  // iso = YYYY-MM-DD — parse as local date to avoid TZ skew
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const weekday = WEEKDAY_LABELS[date.getDay()] ?? "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${weekday} ${dd}/${mm}`;
}

export function CoverageGapsBanner({
  gaps,
  weekStartIso,
}: {
  gaps: CoverageGap[];
  weekStartIso: string;
}) {
  if (gaps.length === 0) return null;

  const hasEmpty = gaps.some((g) => g.severity === "empty");
  const borderClass = hasEmpty
    ? "border-rose-300/70 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20"
    : "border-amber-300/70 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20";
  const iconClass = hasEmpty
    ? "text-rose-600 dark:text-rose-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <Card className={cn("border-2", borderClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={cn("size-4", iconClass)} />
          <span>Cảnh báo thiếu nhân sự ({gaps.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {gaps.map((g) => {
            const dayLabel = formatDayLabel(g.dateIso);
            const shiftLabel = SHIFT_LABELS[g.shiftType] ?? g.shiftType;
            const tail =
              g.severity === "empty"
                ? "chưa có ai"
                : g.assignedCount === 1
                  ? "chỉ 1 người"
                  : `chỉ ${g.assignedCount} người`;
            const chipClass =
              g.severity === "empty"
                ? "border-rose-300 bg-rose-100/70 text-rose-800 hover:bg-rose-100 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200"
                : "border-amber-300 bg-amber-100/70 text-amber-800 hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200";
            const isCurrentWeek = g.dateIso >= weekStartIso;
            const href = `/shifts?date=${g.dateIso}`;
            return (
              <Link
                key={`${g.dateIso}__${g.shiftType}`}
                href={href}
                prefetch={false}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                  chipClass,
                )}
                title={
                  isCurrentWeek
                    ? "Cuộn xuống lưới tuần"
                    : "Mở tuần chứa ngày này"
                }
              >
                {dayLabel} · {shiftLabel} — {tail}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
