import Link from "next/link";
import { ListChecks, AlertCircle, CheckCircle2, Clock, Download } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { TaskPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import {
  collectTagFrequency,
  parseTags,
  stripTagsMarker,
} from "@/lib/task-tags";
import { TaskForm } from "./task-form";
import { ToggleTaskButton, DeleteTaskButton } from "./task-row-actions";
import { TaskTitleEdit } from "./task-title-edit";
import { RecurringTemplatesDialog } from "./recurring-templates-dialog";
import { ViewToggle, type TasksView } from "./view-toggle";
import { KanbanBoard } from "./kanban-board";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

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

function dueBucket(dueDate: Date | null): {
  label: string;
  className: string;
} {
  if (!dueDate) return { label: "Không hạn", className: "text-muted-foreground" };
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

const PRIORITY_VALUES = ["low", "normal", "high", "urgent"] as const;
type PriorityValue = (typeof PRIORITY_VALUES)[number];

function isPriorityValue(value: string | undefined): value is PriorityValue {
  return (
    value === "low" || value === "normal" || value === "high" || value === "urgent"
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    assignee?: string;
    tag?: string;
    priority?: string;
    showArchived?: string;
    view?: string;
  }>;
}) {
  const sp = await searchParams;
  const sess = await getSession();
  const isAdmin = sess?.role === "admin";
  const view: TasksView = sp.view === "kanban" ? "kanban" : "list";
  const statusFilter =
    sp.status === "open" || sp.status === "done" || sp.status === "overdue"
      ? sp.status
      : "all";
  const assigneeFilter =
    sp.assignee && /^\d+$/.test(sp.assignee) ? Number(sp.assignee) : null;
  const tagFilter = sp.tag ? sp.tag.trim().toLowerCase() : null;
  const priorityFilter: PriorityValue | null = isPriorityValue(sp.priority)
    ? sp.priority
    : null;
  const showArchived = sp.showArchived === "1" || sp.showArchived === "true";
  const archiveCutoff = new Date(Date.now() - 90 * 86400000);

  let tasks: Array<
    Awaited<ReturnType<typeof prisma.task.findMany>>[number] & {
      assignee: {
        name: string;
        avatarUrl: string | null;
        role: string;
        email: string | null;
      };
    }
  > = [];
  let employees: { id: number; name: string }[] = [];
  let openCount = 0;
  let overdueCount = 0;
  let priorityGroup: Array<{
    priority: TaskPriority;
    _count: { _all: number };
  }> = [];
  let statusOpenTotal = 0;
  let statusDoneTotal = 0;
  let archivedCount = 0;
  let error: string | null = null;

  try {
    const where: Prisma.TaskWhereInput = {};
    if (statusFilter === "open") where.completedAt = null;
    if (statusFilter === "done") where.completedAt = { not: null };
    if (statusFilter === "overdue") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.completedAt = null;
      where.dueDate = { lt: today, not: null };
    }
    if (assigneeFilter) where.assigneeId = assigneeFilter;
    if (priorityFilter) where.priority = priorityFilter;
    if (!showArchived) {
      where.NOT = {
        AND: [
          { completedAt: { not: null } },
          { completedAt: { lt: archiveCutoff } },
        ],
      };
    }

    [
      tasks,
      employees,
      openCount,
      overdueCount,
      priorityGroup,
      statusOpenTotal,
      statusDoneTotal,
      archivedCount,
    ] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [
          { completedAt: { sort: "asc", nulls: "first" } },
          { dueDate: { sort: "asc", nulls: "last" } },
          { priority: "desc" },
        ],
        include: {
          assignee: {
            select: { name: true, avatarUrl: true, role: true, email: true },
          },
        },
      }),
      prisma.employee.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.task.count({ where: { completedAt: null } }),
      prisma.task.count({
        where: {
          completedAt: null,
          dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)), not: null },
        },
      }),
      prisma.task.groupBy({
        by: ["priority"],
        _count: { _all: true },
      }),
      prisma.task.count({ where: { completedAt: null } }),
      prisma.task.count({ where: { completedAt: { not: null } } }),
      prisma.task.count({
        where: {
          AND: [
            { completedAt: { not: null } },
            { completedAt: { lt: archiveCutoff } },
          ],
        },
      }),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const priorityCounts: Record<PriorityValue, number> = {
    low: 0,
    normal: 0,
    high: 0,
    urgent: 0,
  };
  for (const row of priorityGroup) {
    priorityCounts[row.priority as PriorityValue] = row._count._all;
  }
  const priorityTotal =
    priorityCounts.low +
    priorityCounts.normal +
    priorityCounts.high +
    priorityCounts.urgent;
  const statusAllTotal = statusOpenTotal + statusDoneTotal;

  const tagFrequency = collectTagFrequency(tasks.map((t) => t.description));
  const filteredTasks = tagFilter
    ? tasks.filter((t) => parseTags(t.description).includes(tagFilter))
    : tasks;
  const open = filteredTasks.filter((t) => !t.completedAt);
  const done = filteredTasks.filter((t) => t.completedAt);

  type FilterOverrides = {
    status?: string | null;
    assignee?: number | null;
    tag?: string | null;
    priority?: string | null;
    showArchived?: boolean;
  };

  function buildHref(overrides: FilterOverrides = {}): string {
    const next = {
      status: "status" in overrides ? overrides.status : statusFilter === "all" ? null : statusFilter,
      assignee: "assignee" in overrides ? overrides.assignee : assigneeFilter,
      tag: "tag" in overrides ? overrides.tag : tagFilter,
      priority: "priority" in overrides ? overrides.priority : priorityFilter,
      showArchived:
        "showArchived" in overrides ? overrides.showArchived : showArchived,
    };
    const params = new URLSearchParams();
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.assignee) params.set("assignee", String(next.assignee));
    if (next.tag) params.set("tag", next.tag);
    if (next.priority) params.set("priority", next.priority);
    if (next.showArchived) params.set("showArchived", "1");
    if (view === "kanban") params.set("view", "kanban");
    const qs = params.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  }

  function buildTagHref(tag: string | null): string {
    return buildHref({ tag });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Clock} label="Đang mở" value={openCount} accent="primary" />
        <KpiCard
          icon={AlertCircle}
          label="Quá hạn"
          value={overdueCount}
          accent={overdueCount > 0 ? "destructive" : "muted"}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Đã hoàn thành"
          value={tasks.filter((t) => t.completedAt).length}
          accent="muted"
        />
      </section>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Giao việc mới</CardTitle>
            <CardDescription>
              Tạo task cho nhân viên với mức độ ưu tiên + hạn hoàn thành
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có nhân viên — vào trang Nhân viên để thêm trước.
              </p>
            ) : (
              <TaskForm employees={employees} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-5" />
              Danh sách công việc ({filteredTasks.length})
            </CardTitle>
            <CardDescription>
              {statusFilter === "open"
                ? "Đang mở"
                : statusFilter === "done"
                  ? "Đã hoàn thành"
                  : statusFilter === "overdue"
                    ? "Quá hạn"
                    : "Tất cả"}
              {assigneeFilter &&
                ` · NV ${employees.find((e) => e.id === assigneeFilter)?.name ?? `#${assigneeFilter}`}`}
              {priorityFilter && ` · Ưu tiên: ${PRIORITY_LABELS[priorityFilter]}`}
              {tagFilter && ` · #${tagFilter}`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle current={view} />
            <div className="flex flex-wrap gap-1 rounded-md border bg-card p-0.5 text-xs">
              {[
                { value: "all", label: "Tất cả" },
                { value: "open", label: "Đang mở" },
                { value: "overdue", label: `Quá hạn ${overdueCount > 0 ? `(${overdueCount})` : ""}` },
                { value: "done", label: "Hoàn thành" },
              ].map((f) => (
                <Link
                  key={f.value}
                  href={buildHref({ status: f.value === "all" ? null : f.value })}
                  className={cn(
                    "rounded px-2.5 py-1 font-medium transition-colors",
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            {isAdmin && (
              <RecurringTemplatesDialog
                employees={employees}
                isAdmin={isAdmin}
              />
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/api/tasks/csv" prefetch={false}>
                <Download />
                Xuất CSV
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trạng thái
            </span>
            {(
              [
                { value: "all", label: "Tất cả", count: statusAllTotal },
                { value: "open", label: "Chưa xong", count: statusOpenTotal },
                { value: "done", label: "Đã xong", count: statusDoneTotal },
              ] as const
            ).map((opt) => {
              const active =
                opt.value === "all"
                  ? statusFilter === "all"
                  : statusFilter === opt.value;
              return (
                <Link
                  key={opt.value}
                  href={buildHref({
                    status: active || opt.value === "all" ? null : opt.value,
                  })}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                  <span className="ml-1 opacity-70">{opt.count}</span>
                </Link>
              );
            })}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ưu tiên
            </span>
            {(
              [
                { value: null, label: "Tất cả", count: priorityTotal },
                { value: "urgent", label: "Khẩn", count: priorityCounts.urgent },
                { value: "high", label: "Cao", count: priorityCounts.high },
                { value: "normal", label: "Bình thường", count: priorityCounts.normal },
                { value: "low", label: "Thấp", count: priorityCounts.low },
              ] as const
            ).map((opt) => {
              const active =
                opt.value === null
                  ? priorityFilter === null
                  : priorityFilter === opt.value;
              return (
                <Link
                  key={opt.value ?? "all"}
                  href={buildHref({
                    priority: active || opt.value === null ? null : opt.value,
                  })}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                  <span className="ml-1 opacity-70">{opt.count}</span>
                </Link>
              );
            })}
          </div>
          {tagFrequency.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {tagFilter && (
                <Link
                  href={buildTagHref(null)}
                  className="rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tất cả
                </Link>
              )}
              {tagFrequency.map(({ tag, count }) => {
                const active = tagFilter === tag;
                return (
                  <Link
                    key={tag}
                    href={active ? buildTagHref(null) : buildTagHref(tag)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    #{tag}
                    <span className="ml-1 opacity-70">{count}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {archivedCount > 0 && !showArchived && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span>📦 {archivedCount} việc cũ đã ẩn (hoàn thành &gt; 90 ngày)</span>
              <Link
                href={buildHref({ showArchived: true })}
                className="font-medium text-primary hover:underline"
              >
                Hiện việc cũ
              </Link>
            </div>
          )}
          {showArchived && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
              <span>
                Đang xem cả {archivedCount} việc đã lưu trữ
              </span>
              <Link
                href={buildHref({ showArchived: false })}
                className="font-medium hover:underline"
              >
                Ẩn
              </Link>
            </div>
          )}
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              illustration="/illustrations/empty-tasks.png"
              title={
                statusFilter === "all" && !tagFilter && !priorityFilter
                  ? "Chưa có công việc nào"
                  : "Không có công việc khớp bộ lọc"
              }
              description={
                statusFilter === "all" && !tagFilter && !priorityFilter
                  ? isAdmin
                    ? "Tạo task đầu tiên bằng form ở trên."
                    : "Hiện chưa có việc nào được giao."
                  : "Thử đổi bộ lọc khác hoặc xem tất cả."
              }
            />
          ) : view === "kanban" ? (
            <KanbanBoard
              tasks={filteredTasks}
              isAdmin={isAdmin}
              currentUserEmail={sess?.email ?? null}
              activeTag={tagFilter}
              buildTagHref={buildTagHref}
            />
          ) : (
            <div className="space-y-3">
              {open.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Đang làm ({open.length})
                  </h3>
                  {open.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      isAdmin={isAdmin}
                      currentUserEmail={sess?.email ?? null}
                      dueInfo={dueBucket(t.dueDate)}
                      activeTag={tagFilter}
                      buildTagHref={buildTagHref}
                    />
                  ))}
                </div>
              )}
              {done.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Đã hoàn thành ({done.length})
                  </h3>
                  {done.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      isAdmin={isAdmin}
                      currentUserEmail={sess?.email ?? null}
                      dueInfo={dueBucket(t.dueDate)}
                      activeTag={tagFilter}
                      buildTagHref={buildTagHref}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskRow({
  task,
  isAdmin,
  currentUserEmail,
  dueInfo,
  activeTag,
  buildTagHref,
}: {
  task: Awaited<ReturnType<typeof prisma.task.findMany>>[number] & {
    assignee: {
      name: string;
      avatarUrl: string | null;
      role: string;
      email: string | null;
    };
  };
  isAdmin: boolean;
  currentUserEmail: string | null;
  dueInfo: { label: string; className: string };
  activeTag: string | null;
  buildTagHref: (tag: string | null) => string;
}) {
  const isDone = !!task.completedAt;
  const tags = parseTags(task.description);
  const cleanDescription = stripTagsMarker(task.description);
  const visibleTags = tags.slice(0, 3);
  const overflow = tags.length - visibleTags.length;
  const isAssignee =
    !!currentUserEmail &&
    !!task.assignee.email &&
    task.assignee.email.toLowerCase() === currentUserEmail.toLowerCase();
  const canEditTitle = isAdmin || isAssignee;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card/40 p-3 transition-opacity",
        isDone && "opacity-60",
      )}
    >
      <Avatar
        src={task.assignee.avatarUrl}
        alt={task.assignee.name}
        fallback={task.assignee.name}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {canEditTitle ? (
            <TaskTitleEdit
              id={task.id}
              title={task.title}
              isDone={isDone}
            />
          ) : (
            <p className={cn("font-medium", isDone && "line-through")}>
              {task.title}
            </p>
          )}
          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"} className="text-[10px]">
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
        {cleanDescription && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {cleanDescription}
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
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
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>NV: <strong>{task.assignee.name}</strong></span>
          <span>·</span>
          <span className={dueInfo.className}>{dueInfo.label}</span>
          {task.createdByName && (
            <>
              <span>·</span>
              <span>Giao bởi {task.createdByName}</span>
            </>
          )}
          {isDone && task.completedByName && (
            <>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ✓ {task.completedByName}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ToggleTaskButton id={task.id} isDone={isDone} />
        {isAdmin && <DeleteTaskButton id={task.id} />}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: "primary" | "destructive" | "muted";
}) {
  const cls =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "destructive"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
        : "bg-secondary text-secondary-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-10 items-center justify-center rounded-lg ${cls}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-none">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
