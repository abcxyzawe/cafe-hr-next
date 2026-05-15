import Link from "next/link";
import { List, CalendarDays, Download, Wallet } from "lucide-react";
import type { Prisma } from "@prisma/client";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import { LeaveForm } from "./leave-form";
import { DecisionButtons, DeleteLeaveButton } from "./decision-buttons";
import { LeaveCalendar } from "./leave-calendar";
import { findLeaveConflicts, type LeaveLite } from "@/lib/leave-conflicts";
import { LeaveConflictChip } from "@/components/leave-conflict-chip";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  annual: "Nghỉ phép",
  sick: "Nghỉ ốm",
  personal: "Cá nhân",
  unpaid: "Không lương",
};

const TYPE_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  annual: "default",
  sick: "warning",
  personal: "secondary",
  unpaid: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "secondary",
};

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string; y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const sess = await getSession();
  const isAdmin = sess?.role === "admin";
  const view = sp.view === "calendar" ? "calendar" : "list";
  const statusFilter =
    sp.status && ["pending", "approved", "rejected", "cancelled"].includes(sp.status)
      ? (sp.status as "pending" | "approved" | "rejected" | "cancelled")
      : null;

  // Calendar params (default to current month)
  const today = new Date();
  const calYear =
    sp.y && /^\d{4}$/.test(sp.y) ? Number(sp.y) : today.getFullYear();
  const calMonth =
    sp.m && /^\d{1,2}$/.test(sp.m) && Number(sp.m) >= 1 && Number(sp.m) <= 12
      ? Number(sp.m) - 1
      : today.getMonth();

  let leaves: Array<
    Awaited<ReturnType<typeof prisma.leaveRequest.findMany>>[number] & {
      employee: { name: string; role: string; avatarUrl: string | null };
    }
  > = [];
  let employees: { id: number; name: string }[] = [];
  let pendingCount = 0;
  let error: string | null = null;

  try {
    // For calendar view, ignore status filter and fetch wider range
    const where: Prisma.LeaveRequestWhereInput = {};
    if (view === "list" && statusFilter) where.status = statusFilter;
    if (view === "calendar") {
      // Fetch leaves that overlap the visible month (with 1-month padding for grid)
      const winStart = new Date(calYear, calMonth - 1, 1);
      const winEnd = new Date(calYear, calMonth + 2, 1);
      where.AND = [
        { startDate: { lt: winEnd } },
        { endDate: { gte: winStart } },
      ];
    }

    [leaves, employees, pendingCount] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
        include: {
          employee: {
            select: { name: true, role: true, avatarUrl: true },
          },
        },
      }),
      prisma.employee.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.leaveRequest.count({ where: { status: "pending" } }),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Compute conflict map across the fetched leaves (only pending/approved
  // count as overlap candidates inside findLeaveConflicts; cancelled rows
  // are dropped here, rejected rows are passed through but ignored).
  const conflictInputs: LeaveLite[] = leaves.flatMap((l) => {
    if (
      l.status !== "pending" &&
      l.status !== "approved" &&
      l.status !== "rejected"
    ) {
      return [];
    }
    const lite: LeaveLite = {
      id: l.id,
      employeeId: l.employeeId,
      employeeRole: l.employee.role,
      startDate: l.startDate,
      endDate: l.endDate,
      status: l.status,
    };
    return [lite];
  });
  const conflictMap = findLeaveConflicts(conflictInputs);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo đơn nghỉ</CardTitle>
            <CardDescription>
              Quản lý tạo đơn nghỉ phép thay nhân viên. Đơn sẽ ở trạng thái{" "}
              <Badge variant="warning" className="ml-1">
                Chờ duyệt
              </Badge>{" "}
              cho đến khi được duyệt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có nhân viên nào — vào trang Nhân viên để thêm trước.
              </p>
            ) : (
              <LeaveForm employees={employees} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>
              Đơn nghỉ ({leaves.length})
              {pendingCount > 0 && (
                <Badge variant="warning" className="ml-2">
                  {pendingCount} chờ duyệt
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {view === "calendar"
                ? "Xem dạng lịch tháng — pills theo nhân viên + ngày"
                : statusFilter
                  ? `Lọc theo trạng thái: ${STATUS_LABELS[statusFilter]}`
                  : "Tất cả đơn xin nghỉ"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border bg-card p-0.5 shadow-sm">
              <Link
                href="/leave"
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3.5" /> Danh sách
              </Link>
              <Link
                href="/leave?view=calendar"
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  view === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarDays className="size-3.5" /> Lịch
              </Link>
            </div>
          {view === "list" && (
          <form action="/leave" className="flex items-center gap-2">
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm [&>option]:bg-background [&>option]:text-foreground"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
          </form>
          )}
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/api/leave/csv${statusFilter ? `?status=${statusFilter}` : ""}`}
              prefetch={false}
            >
              <Download />
              Xuất CSV
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href="/leave-balance">
                <Wallet />
                Xem số dư phép
              </Link>
            </Button>
          )}
          </div>
        </CardHeader>
        <CardContent className={view === "calendar" ? "" : "p-0"}>
          {error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : view === "calendar" ? (
            <LeaveCalendar
              year={calYear}
              month={calMonth}
              leaves={leaves.map((l) => ({
                id: l.id,
                employeeId: l.employeeId,
                type: l.type,
                status: l.status,
                startDate: l.startDate,
                endDate: l.endDate,
                employee: {
                  name: l.employee.name,
                  avatarUrl: l.employee.avatarUrl,
                },
              }))}
            />
          ) : leaves.length === 0 ? (
            <EmptyState
              illustration="/illustrations/empty-leaves.png"
              title={
                statusFilter
                  ? "Không có đơn nào khớp bộ lọc"
                  : "Chưa có đơn nghỉ nào"
              }
              description={
                statusFilter
                  ? "Thử chọn trạng thái khác hoặc xem tất cả."
                  : "Admin có thể tạo đơn nghỉ thay nhân viên ở form phía trên."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Từ ngày</TableHead>
                  <TableHead>Đến ngày</TableHead>
                  <TableHead className="text-right">Số ngày</TableHead>
                  <TableHead className="hidden md:table-cell">Lý do</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {isAdmin && (
                    <TableHead className="w-[140px] text-right">Hành động</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={l.employee.avatarUrl}
                          alt={l.employee.name}
                          fallback={l.employee.name}
                          size={32}
                        />
                        <span className="font-medium">{l.employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_VARIANT[l.type] ?? "secondary"}>
                        {TYPE_LABELS[l.type] ?? l.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(l.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(l.endDate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {daysBetween(l.startDate, l.endDate)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[240px] truncate text-sm text-muted-foreground">
                      {l.reason || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[l.status] ?? "secondary"}>
                        {STATUS_LABELS[l.status]}
                      </Badge>
                      <LeaveConflictChip
                        conflicts={conflictMap.get(l.id) ?? []}
                        requestId={l.id}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {l.status === "pending" ? (
                          <DecisionButtons id={l.id} />
                        ) : (
                          <div className="flex justify-end">
                            <DeleteLeaveButton id={l.id} />
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
