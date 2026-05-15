import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CleanupDialog } from "./cleanup-dialog";
import { highlightMatch } from "./highlight";
import { AuditFilterPresets } from "./filter-presets";
import { AuditRow } from "./audit-row";
import { StarFilterToggle } from "./star-filter-toggle";
import { AuditDateRange } from "./audit-date-range";
import { PerPageSelector } from "./per-page-selector";
import { AiSummaryCard } from "./ai-summary-card";
import {
  currentDayKey,
  gatherAuditFacts,
  getCachedSummary,
} from "@/lib/audit-summary-data";

export const dynamic = "force-dynamic";

const PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;
const DEFAULT_PER_PAGE = 50;
type PerPage = (typeof PER_PAGE_OPTIONS)[number];

import type { AuditIconName } from "./audit-row";

const ICON_NAME_MAP: Record<string, AuditIconName> = {
  "employee.create": "user-plus",
  "employee.update": "pencil",
  "employee.delete": "user-minus",
  "employee.avatar": "sparkles",
  "employee.avatar.batch": "sparkles",
  "shift.create": "calendar-plus",
  "shift.delete": "calendar-minus",
  "attendance.checkin": "login",
  "attendance.checkout": "logout",
  "user.login": "login",
  "user.logout": "logout",
  "user.create": "user-plus",
  "user.password": "pencil",
};

const ACCENT_MAP: Record<string, string> = {
  "employee.create":
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "employee.delete":
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "employee.avatar":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "employee.avatar.batch":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "shift.delete": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "user.login": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  "user.logout": "bg-muted text-muted-foreground",
};

const ACTION_PREFIXES: Array<{ value: string; label: string }> = [
  { value: "", label: "Tất cả hành động" },
  { value: "employee", label: "Nhân viên" },
  { value: "shift", label: "Ca làm" },
  { value: "attendance", label: "Chấm công" },
  { value: "leave", label: "Nghỉ phép" },
  { value: "task", label: "Công việc" },
  { value: "payroll", label: "Bảng lương" },
  { value: "user", label: "Tài khoản" },
];

type SearchParams = {
  q?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: string;
  per?: string;
  starred?: string;
};

function parsePage(value: string | undefined): number {
  if (!value) return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function parsePerPage(value: string | undefined): PerPage {
  if (!value) return DEFAULT_PER_PAGE;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PER_PAGE;
  const floored = Math.floor(n);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(floored)
    ? (floored as PerPage)
    : DEFAULT_PER_PAGE;
}

function parseUserId(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

function parseDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildHref(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === null) continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return qs ? `/audit?${qs}` : "/audit";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sess = await getSession();
  if (sess?.role !== "admin") redirect("/");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const actionPrefix =
    sp.action && ACTION_PREFIXES.some((a) => a.value === sp.action)
      ? sp.action
      : "";
  const userId = parseUserId(sp.userId);
  const fromDate = parseDate(sp.from);
  const toDate = parseDate(sp.to);
  const page = parsePage(sp.page);
  const perPage = parsePerPage(sp.per);
  const starredOnly = sp.starred === "1";

  const where: Prisma.ActivityLogWhereInput = {};
  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
    ];
  }
  if (actionPrefix) where.action = { startsWith: `${actionPrefix}.` };
  if (userId !== null) where.userId = userId;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) {
      const end = new Date(toDate);
      end.setDate(end.getDate() + 1);
      where.createdAt.lt = end;
    }
  }

  const logsQuery = Prisma.validator<Prisma.ActivityLogDefaultArgs>()({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  type LogItem = Prisma.ActivityLogGetPayload<typeof logsQuery>;
  let logs: LogItem[] = [];
  let total = 0;
  let users: Array<{ id: number; name: string; email: string }> = [];
  let error: string | null = null;

  try {
    const [items, count, allUsers] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: perPage,
        skip: (page - 1) * perPage,
        include: logsQuery.include,
      }),
      prisma.activityLog.count({ where }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);
    logs = items;
    total = count;
    users = allUsers;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  let auditFacts: Awaited<ReturnType<typeof gatherAuditFacts>> | null = null;
  try {
    auditFacts = await gatherAuditFacts(7);
  } catch {
    auditFacts = null;
  }
  const cachedSummary = getCachedSummary(currentDayKey());
  const summaryProp = cachedSummary
    ? {
        generatedAtIso: cachedSummary.generatedAt.toISOString(),
        content: cachedSummary.content,
      }
    : null;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasFilters = q !== "" || actionPrefix !== "" || userId !== null || fromDate !== null || toDate !== null;

  const baseFilterParams: Record<string, string | number | undefined> = {
    q: q || undefined,
    action: actionPrefix || undefined,
    userId: userId !== null ? userId : undefined,
    from: sp.from && fromDate ? sp.from : undefined,
    to: sp.to && toDate ? sp.to : undefined,
    per: perPage !== DEFAULT_PER_PAGE ? perPage : undefined,
  };

  const hrefWithout = (key: keyof typeof baseFilterParams): string => {
    const next: Record<string, string | number | undefined> = { ...baseFilterParams };
    next[key] = undefined;
    return buildHref(next);
  };

  const actionLabel =
    ACTION_PREFIXES.find((a) => a.value === actionPrefix)?.label ?? actionPrefix;
  const selectedUser =
    userId !== null ? users.find((u) => u.id === userId) ?? null : null;

  type ActiveChip = { key: keyof typeof baseFilterParams; label: string };
  const activeChips: ActiveChip[] = [];
  if (q) activeChips.push({ key: "q", label: `Tìm: ${q}` });
  if (actionPrefix) activeChips.push({ key: "action", label: `Loại: ${actionLabel}` });
  if (userId !== null)
    activeChips.push({
      key: "userId",
      label: `User: ${selectedUser?.name ?? `#${userId}`}`,
    });
  if (sp.from && fromDate) activeChips.push({ key: "from", label: `Từ: ${sp.from}` });
  if (sp.to && toDate) activeChips.push({ key: "to", label: `Đến: ${sp.to}` });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="size-5 text-primary" />
              <div>
                <CardTitle>Nhật ký hệ thống</CardTitle>
                <CardDescription>
                  Audit trail toàn bộ thao tác — chỉ admin mới xem được.
                </CardDescription>
              </div>
            </div>
            {sess.role === "admin" && <CleanupDialog />}
          </div>
        </CardHeader>
        <CardContent>
          <form method="GET" action="/audit" className="grid gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label htmlFor="audit-q" className="mb-1.5 block text-xs">
                Tìm trong nội dung
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="audit-q"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="VD: tạo nhân viên, employee.update, attendance..."
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="audit-action" className="mb-1.5 block text-xs">
                Hành động
              </Label>
              <select
                id="audit-action"
                name="action"
                defaultValue={actionPrefix}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm [&>option]:bg-background [&>option]:text-foreground"
              >
                {ACTION_PREFIXES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="audit-user" className="mb-1.5 block text-xs">
                Người thực hiện
              </Label>
              <select
                id="audit-user"
                name="userId"
                defaultValue={userId !== null ? String(userId) : ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm [&>option]:bg-background [&>option]:text-foreground"
              >
                <option value="">Tất cả người dùng</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-5">
              <AuditDateRange
                initialFrom={sp.from && fromDate ? sp.from : null}
                initialTo={sp.to && toDate ? sp.to : null}
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-5">
              <Button type="submit" size="sm">
                <Search className="size-4" />
                Tìm kiếm
              </Button>
              {hasFilters && (
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/audit">
                    <X className="size-4" />
                    Xoá bộ lọc
                  </Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <AuditFilterPresets />

      <StarFilterToggle
        active={starredOnly}
        toggleHref={buildHref({
          ...baseFilterParams,
          starred: starredOnly ? undefined : 1,
        })}
      />

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Bộ lọc đang áp dụng:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
            >
              <span className="max-w-[220px] truncate">{chip.label}</span>
              <Link
                href={hrefWithout(chip.key)}
                aria-label={`Xoá bộ lọc ${chip.label}`}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="size-3" />
              </Link>
            </span>
          ))}
          <Link
            href="/audit"
            className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Xoá tất cả bộ lọc
          </Link>
        </div>
      )}

      {auditFacts && (
        <AiSummaryCard summary={summaryProp} facts={auditFacts} />
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>
              Kết quả{" "}
              <Badge variant="secondary" className="ml-1">
                {total}
              </Badge>
            </CardTitle>
            <CardDescription>
              {total === 0
                ? "Không có bản ghi nào khớp"
                : `Trang ${page} / ${totalPages} · hiển thị ${logs.length} / ${total} bản ghi`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PerPageSelector
              value={perPage}
              currentParams={{
                q: q || undefined,
                action: actionPrefix || undefined,
                userId: userId !== null ? String(userId) : undefined,
                from: sp.from && fromDate ? sp.from : undefined,
                to: sp.to && toDate ? sp.to : undefined,
                starred: starredOnly ? "1" : undefined,
              }}
            />
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref({ ...baseFilterParams, page: page - 1 })}>
                  <ChevronLeft className="size-4" />
                  Trước
                </Link>
              </Button>
            ) : (
              <Button type="button" disabled variant="outline" size="sm">
                <ChevronLeft className="size-4" />
                Trước
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref({ ...baseFilterParams, page: page + 1 })}>
                  Sau
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button type="button" disabled variant="outline" size="sm">
                Sau
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <ScrollText className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Không tìm thấy bản ghi khớp với bộ lọc."
                  : "Chưa có hoạt động nào được ghi nhận."}
              </p>
              {hasFilters && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/audit">
                    <X className="size-4" />
                    Xoá bộ lọc
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]"></TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead className="hidden md:table-cell">Đối tượng</TableHead>
                  <TableHead className="text-right">Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => {
                  const iconName = ICON_NAME_MAP[l.action] ?? "clock";
                  const accent =
                    ACCENT_MAP[l.action] ?? "bg-secondary text-secondary-foreground";
                  return (
                    <AuditRow
                      key={l.id}
                      row={{
                        id: l.id,
                        action: l.action,
                        createdAt: l.createdAt,
                        entityType: l.entityType,
                        entityId: l.entityId,
                        user: l.user,
                        metadata: l.metadata,
                      }}
                      iconName={iconName}
                      accentClass={accent}
                      summaryNode={highlightMatch(l.summary, q)}
                      starredOnly={starredOnly}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
