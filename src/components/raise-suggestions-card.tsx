import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatVND, ROLE_LABELS } from "@/lib/utils";
import type { RaiseSuggestion } from "@/lib/raise-suggestions";

export function RaiseSuggestionsCard({ items }: { items: RaiseSuggestion[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
            Đề xuất tăng lương
          </CardTitle>
          <CardDescription>
            {items.length} nhân viên xuất sắc đang nhận dưới trung vị — cân nhắc
            nâng lương
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/employees">
            Mở danh sách <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((it) => (
            <li
              key={it.employeeId}
              data-employee-id={it.employeeId}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  src={it.avatarUrl}
                  fallback={it.name}
                  alt={it.name}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABELS[it.role] ?? it.role}
                  </p>
                  {it.reasons.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {it.reasons.map((r, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1 inline-block size-1 shrink-0 rounded-full bg-muted-foreground/60"
                          />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {formatVND(it.hourlyRate)}/giờ vs trung vị{" "}
                  {formatVND(it.medianRate)}
                </span>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/employees">
                    So sánh / Tăng lương
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
