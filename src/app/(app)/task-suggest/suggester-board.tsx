"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  ListTodo,
  ArrowRight,
  Clock3,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { SuggesterFacts } from "@/lib/task-suggest-data";
import type {
  TaskSuggestion,
  TaskSuggestionDue,
  TaskSuggestionPriority,
} from "@/lib/xai";
import { refreshTaskSuggestionsAction } from "./refresh-action";

type Props = {
  initialFacts: SuggesterFacts;
};

const PRIORITY_STYLES: Record<TaskSuggestionPriority, string> = {
  low: "bg-slate-500/10 text-slate-700 ring-slate-500/30 dark:text-slate-300",
  normal:
    "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  high: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  urgent:
    "bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300",
};

const PRIORITY_LABEL: Record<TaskSuggestionPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
};

const DUE_LABEL: Record<TaskSuggestionDue, string> = {
  today: "Hôm nay",
  tomorrow: "Ngày mai",
  "this-week": "Tuần này",
};

const DUE_ICON: Record<TaskSuggestionDue, typeof Clock3> = {
  today: Clock3,
  tomorrow: CalendarDays,
  "this-week": CalendarRange,
};

const ROLE_LABEL: Record<string, string> = {
  barista: "Barista",
  server: "Phục vụ",
  cashier: "Thu ngân",
  manager: "Quản lý",
  any: "Bất kỳ",
};

function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

export function SuggesterBoard({ initialFacts: _initialFacts }: Props) {
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<TaskSuggestion[] | null>(null);
  const [hasRun, setHasRun] = useState(false);

  function generate(): void {
    startTransition(async () => {
      const res = await refreshTaskSuggestionsAction();
      setHasRun(true);
      if (res.ok) {
        setSuggestions(res.suggestions);
        toast.success("Đã tạo 5 gợi ý task");
      } else {
        toast.error(res.error || "Không tạo được gợi ý");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-indigo-500" />
            Gợi ý từ AI
          </CardTitle>
          <CardDescription>
            5 đầu việc cụ thể, vừa sức một ca làm. Bấm &quot;Tạo task&quot; để
            chuyển sang trang Tasks và lưu.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={pending}
          onClick={generate}
          className="gap-1.5"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {pending ? "Đang gợi ý..." : "Gợi ý 5 task"}
        </Button>
      </CardHeader>
      <CardContent>
        {!hasRun && !pending && (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            Chưa có gợi ý. Bấm{" "}
            <span className="font-medium text-foreground">Gợi ý 5 task</span>{" "}
            để AI phân tích số liệu hôm nay và đề xuất việc cần làm.
          </div>
        )}

        {pending && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            AI đang phân tích...
          </div>
        )}

        {!pending && suggestions && suggestions.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {suggestions.map((s, i) => {
              const DueIcon = DUE_ICON[s.due];
              const href = `/tasks?suggested=${encodeURIComponent(s.title)}`;
              return (
                <li
                  key={`${i}-${s.title}`}
                  className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold leading-snug">
                      {s.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${PRIORITY_STYLES[s.priority]}`}
                      >
                        {PRIORITY_LABEL[s.priority]}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 ring-1 ring-border">
                        {roleLabel(s.assigneeRole)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 ring-1 ring-border">
                        <DueIcon className="size-3" />
                        {DUE_LABEL[s.due]}
                      </span>
                    </div>
                    <p className="text-sm italic text-muted-foreground">
                      {s.reason}
                    </p>
                  </div>
                  <div className="mt-auto flex justify-end">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <Link href={href}>
                        <ListTodo className="size-3.5" />
                        Tạo task
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!pending && hasRun && suggestions && suggestions.length === 0 && (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            AI không trả về gợi ý nào. Hãy thử lại.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
