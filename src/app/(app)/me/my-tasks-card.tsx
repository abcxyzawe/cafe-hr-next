"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, ListTodo, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { toggleTask } from "../tasks/actions";

type TaskPriority = "low" | "normal" | "high" | "urgent";

export type MyTaskItem = {
  id: number;
  title: string;
  dueDate: Date | null;
  priority: TaskPriority;
  completedAt: Date | null;
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
};

const PRIORITY_VARIANT: Record<
  TaskPriority,
  "default" | "secondary" | "warning" | "destructive"
> = {
  low: "secondary",
  normal: "default",
  high: "warning",
  urgent: "destructive",
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dueLabel(dueDate: Date | null): { label: string; className: string } {
  if (!dueDate) return { label: "Không hạn", className: "text-muted-foreground" };
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0)
    return {
      label: `Quá hạn ${-days} ngày`,
      className: "font-medium text-destructive",
    };
  if (days === 0)
    return {
      label: "Hôm nay",
      className: "font-medium text-amber-700 dark:text-amber-400",
    };
  if (days === 1)
    return {
      label: "Ngày mai",
      className: "text-amber-600 dark:text-amber-400",
    };
  if (days <= 7)
    return { label: `Sắp tới · còn ${days} ngày`, className: "text-foreground" };
  return { label: formatDate(due), className: "text-muted-foreground" };
}

function isWithinLast7Days(d: Date): boolean {
  const now = Date.now();
  return now - d.getTime() <= 7 * 86_400_000;
}

export function MyTasksCard({
  tasks,
  headerAction,
}: {
  tasks: MyTaskItem[];
  headerAction?: React.ReactNode;
}) {
  const openCount = tasks.filter((t) => t.completedAt == null).length;
  const doneRecentCount = tasks.filter(
    (t) => t.completedAt != null && isWithinLast7Days(t.completedAt),
  ).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="size-4" /> Việc của tôi ({tasks.length})
          </CardTitle>
          <CardDescription>
            {openCount} chưa xong · {doneRecentCount} đã hoàn thành tuần này
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <Button asChild variant="ghost" size="sm">
            <Link href="/tasks">
              Tất cả <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="rounded-md bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            Bạn chưa có việc nào được giao. Tận hưởng nhé!
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: MyTaskItem }) {
  const initialDone = task.completedAt != null;
  const [optimisticDone, setOptimisticDone] = useOptimistic(
    initialDone,
    (_state: boolean, next: boolean) => next,
  );
  const [pending, startTransition] = useTransition();
  const due = dueLabel(task.dueDate);

  function handleToggle() {
    const target = !optimisticDone;
    startTransition(async () => {
      setOptimisticDone(target);
      try {
        await toggleTask(task.id);
        toast.success(target ? "Đã hoàn thành" : "Đã mở lại");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card/40 p-3 transition-opacity",
        optimisticDone && "opacity-60",
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={optimisticDone}
        aria-label={
          optimisticDone ? `Mở lại "${task.title}"` : `Hoàn thành "${task.title}"`
        }
        disabled={pending}
        onClick={handleToggle}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
          optimisticDone
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-input bg-background hover:border-primary",
          pending && "opacity-70",
        )}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : optimisticDone ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium",
              optimisticDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          <Badge
            variant={PRIORITY_VARIANT[task.priority]}
            className="text-[10px]"
          >
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className={due.className}>{due.label}</span>
          {optimisticDone && task.completedAt && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ✓ Đã hoàn thành
              </span>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
