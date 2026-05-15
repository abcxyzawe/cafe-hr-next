import Link from "next/link";
import type { Task } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import { parseTags, stripTagsMarker } from "@/lib/task-tags";
import { ToggleTaskButton, DeleteTaskButton } from "./task-row-actions";
import { TaskTitleEdit } from "./task-title-edit";

export type KanbanTask = Task & {
  assignee: {
    name: string;
    avatarUrl: string | null;
    role: string;
    email: string | null;
  };
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
};

const PRIORITY_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  low: "secondary",
  normal: "default",
  high: "warning",
  urgent: "destructive",
};

type ColumnKey = "pending" | "in_progress" | "done";

const COLUMNS: ReadonlyArray<{
  key: ColumnKey;
  label: string;
  headerClass: string;
  badgeClass: string;
}> = [
  {
    key: "pending",
    label: "Chưa làm",
    headerClass: "bg-muted/60 text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  {
    key: "in_progress",
    label: "Đang làm",
    headerClass:
      "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
    badgeClass:
      "bg-amber-200 text-amber-900 dark:bg-amber-800/50 dark:text-amber-100",
  },
  {
    key: "done",
    label: "Đã xong",
    headerClass:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
    badgeClass:
      "bg-emerald-200 text-emerald-900 dark:bg-emerald-800/50 dark:text-emerald-100",
  },
] as const;

function bucketOf(task: KanbanTask): ColumnKey {
  if (task.completedAt) return "done";
  if (!task.dueDate) return "pending";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  // Due today or overdue → considered "in progress" (active work).
  if (due.getTime() <= today.getTime()) return "in_progress";
  return "pending";
}

function dueLabel(dueDate: Date | null): {
  label: string;
  className: string;
} {
  if (!dueDate)
    return { label: "Không hạn", className: "text-muted-foreground" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0)
    return {
      label: `Quá hạn ${-days} ngày`,
      className: "text-destructive font-medium",
    };
  if (days === 0)
    return {
      label: "Hôm nay",
      className: "text-amber-700 dark:text-amber-400 font-medium",
    };
  if (days === 1)
    return {
      label: "Ngày mai",
      className: "text-amber-600 dark:text-amber-400",
    };
  if (days <= 7)
    return { label: `Còn ${days} ngày`, className: "text-foreground" };
  return { label: formatDate(due), className: "text-muted-foreground" };
}

export function KanbanBoard({
  tasks,
  isAdmin,
  currentUserEmail,
  activeTag,
  buildTagHref,
}: {
  tasks: KanbanTask[];
  isAdmin: boolean;
  currentUserEmail: string | null;
  activeTag: string | null;
  buildTagHref: (tag: string | null) => string;
}) {
  const grouped: Record<ColumnKey, KanbanTask[]> = {
    pending: [],
    in_progress: [],
    done: [],
  };
  for (const t of tasks) grouped[bucketOf(t)].push(t);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = grouped[col.key];
        return (
          <div
            key={col.key}
            className="flex min-w-0 flex-col rounded-lg border bg-card/40"
          >
            <div
              className={cn(
                "flex items-center justify-between rounded-t-lg px-3 py-2 text-sm font-semibold",
                col.headerClass,
              )}
            >
              <span>{col.label}</span>
              <span
                className={cn(
                  "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                  col.badgeClass,
                )}
              >
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Trống
                </p>
              ) : (
                items.map((t) => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    isAdmin={isAdmin}
                    currentUserEmail={currentUserEmail}
                    activeTag={activeTag}
                    buildTagHref={buildTagHref}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task,
  isAdmin,
  currentUserEmail,
  activeTag,
  buildTagHref,
}: {
  task: KanbanTask;
  isAdmin: boolean;
  currentUserEmail: string | null;
  activeTag: string | null;
  buildTagHref: (tag: string | null) => string;
}) {
  const isDone = !!task.completedAt;
  const tags = parseTags(task.description);
  const cleanDescription = stripTagsMarker(task.description);
  const visibleTags = tags.slice(0, 2);
  const overflow = tags.length - visibleTags.length;
  const isAssignee =
    !!currentUserEmail &&
    !!task.assignee.email &&
    task.assignee.email.toLowerCase() === currentUserEmail.toLowerCase();
  const canEditTitle = isAdmin || isAssignee;
  const due = dueLabel(task.dueDate);

  return (
    <div
      className={cn(
        "rounded-md border bg-background p-2.5 shadow-sm transition-opacity",
        isDone && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {canEditTitle ? (
            <TaskTitleEdit
              id={task.id}
              title={task.title}
              isDone={isDone}
            />
          ) : (
            <p
              className={cn(
                "text-sm font-medium",
                isDone && "line-through",
              )}
            >
              {task.title}
            </p>
          )}
        </div>
        <Badge
          variant={PRIORITY_VARIANT[task.priority] ?? "default"}
          className="shrink-0 text-[10px]"
        >
          {PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>

      {cleanDescription && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {cleanDescription}
        </p>
      )}

      {tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {visibleTags.map((tag) => (
            <Link key={tag} href={buildTagHref(tag)}>
              <Badge
                variant={activeTag === tag ? "default" : "secondary"}
                className="text-[10px]"
              >
                #{tag}
              </Badge>
            </Link>
          ))}
          {overflow > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              +{overflow}
            </Badge>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Avatar
          src={task.assignee.avatarUrl}
          alt={task.assignee.name}
          fallback={task.assignee.name}
          role={task.assignee.role}
          size={20}
        />
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {task.assignee.name}
        </span>
        <span className={cn("text-[11px]", due.className)}>{due.label}</span>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1">
        <ToggleTaskButton id={task.id} isDone={isDone} />
        {isAdmin && <DeleteTaskButton id={task.id} />}
      </div>
    </div>
  );
}
