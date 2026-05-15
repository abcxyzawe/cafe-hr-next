import { redirect } from "next/navigation";
import { Plane, Stethoscope, TrendingDown, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import {
  ANNUAL_LEAVE_QUOTA,
  SICK_LEAVE_QUOTA,
  getAllLeaveBalances,
  type EmployeeLeaveBalance,
} from "@/lib/leave-balance";
import { ROLE_LABELS, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MONTH_LABELS_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function ProgressBar({
  used,
  quota,
  tone,
}: {
  used: number;
  quota: number;
  tone: "annual" | "sick";
}) {
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const ratio = used / quota;
  const barColor =
    ratio >= 0.85
      ? "bg-rose-500"
      : ratio >= 0.6
        ? "bg-amber-500"
        : tone === "annual"
          ? "bg-sky-500"
          : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums">
          {used} / {quota}
        </span>
        <span className="text-muted-foreground">
          còn {Math.max(0, quota - used)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
          aria-label={`${pct}%`}
        />
      </div>
    </div>
  );
}

function PredictionCell({
  bal,
  currentMonth,
}: {
  bal: EmployeeLeaveBalance;
  currentMonth: number; // 1-12
}) {
  if (bal.monthlyUsageRate <= 0 || bal.predictedExhaustionMonth === null) {
    return (
      <Badge variant="success" className="whitespace-nowrap">
        Đủ dùng cả năm
      </Badge>
    );
  }
  const m = bal.predictedExhaustionMonth;
  const monthsAway = m - currentMonth;
  const isUrgent = monthsAway >= 0 && monthsAway <= 3;
  return (
    <div className="flex flex-col gap-0.5">
      <Badge
        variant={isUrgent ? "destructive" : "secondary"}
        className="w-fit whitespace-nowrap"
      >
        {isUrgent ? (
          <AlertTriangle className="mr-1 size-3" />
        ) : (
          <TrendingDown className="mr-1 size-3" />
        )}
        Dự kiến hết: {MONTH_LABELS_VI[m - 1]}
      </Badge>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {bal.monthlyUsageRate.toFixed(2)} ngày/tháng
      </span>
    </div>
  );
}

export default async function LeaveBalancePage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const balances = await getAllLeaveBalances();

  const totalEmployees = balances.length;
  const totalAnnualUsed = balances.reduce((s, b) => s + b.annualUsed, 0);
  const totalAnnualQuota = totalEmployees * ANNUAL_LEAVE_QUOTA;
  const totalSickUsed = balances.reduce((s, b) => s + b.sickUsed, 0);
  const totalSickQuota = totalEmployees * SICK_LEAVE_QUOTA;
  const teamPct =
    totalAnnualQuota > 0
      ? Math.round((totalAnnualUsed / totalAnnualQuota) * 100)
      : 0;
  const atRisk = balances.filter(
    (b) =>
      b.predictedExhaustionMonth !== null &&
      b.predictedExhaustionMonth - currentMonth <= 3,
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="size-5 text-sky-500" />
            Số dư phép {year}
          </CardTitle>
          <CardDescription>
            Tổng quan số ngày phép đã dùng và dự báo cạn kiệt cho toàn đội. Chỉ
            tính các đơn đã được duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Phép năm</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {totalAnnualUsed}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  / {totalAnnualQuota} ngày
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full",
                    teamPct >= 75
                      ? "bg-rose-500"
                      : teamPct >= 50
                        ? "bg-amber-500"
                        : "bg-sky-500",
                  )}
                  style={{ width: `${Math.min(100, teamPct)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                {teamPct}% quota toàn đội
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Phép ốm</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {totalSickUsed}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  / {totalSickQuota} ngày
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Stethoscope className="size-3.5" />
                {totalEmployees} nhân viên × {SICK_LEAVE_QUOTA} ngày
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Nhân viên</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {totalEmployees}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Tổng số trong hệ thống
              </div>
            </div>

            <div
              className={cn(
                "rounded-lg border p-4",
                atRisk > 0
                  ? "border-rose-300/60 bg-rose-50/40 dark:border-rose-500/30 dark:bg-rose-950/20"
                  : "bg-muted/30",
              )}
            >
              <div className="text-xs text-muted-foreground">
                Sắp cạn (≤3 tháng)
              </div>
              <div
                className={cn(
                  "mt-1 text-2xl font-semibold tabular-nums",
                  atRisk > 0 && "text-rose-600 dark:text-rose-400",
                )}
              >
                {atRisk}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Nhân viên dự kiến hết phép sớm
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo nhân viên</CardTitle>
          <CardDescription>
            Sắp xếp theo phép năm còn lại ít nhất ở đầu danh sách. Tốc độ sử
            dụng tính theo ngày/tháng kể từ 01/01.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có nhân viên nào.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nhân viên</TableHead>
                    <TableHead className="min-w-[180px]">
                      Phép năm ({ANNUAL_LEAVE_QUOTA} ngày)
                    </TableHead>
                    <TableHead className="min-w-[180px]">
                      Phép ốm ({SICK_LEAVE_QUOTA} ngày)
                    </TableHead>
                    <TableHead className="min-w-[200px]">
                      Dự báo cạn kiệt
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b) => (
                    <TableRow key={b.employeeId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={b.avatarUrl}
                            alt={b.name}
                            fallback={b.name}
                            role={b.role}
                            size={36}
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {b.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ROLE_LABELS[b.role] ?? b.role}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProgressBar
                          used={b.annualUsed}
                          quota={ANNUAL_LEAVE_QUOTA}
                          tone="annual"
                        />
                      </TableCell>
                      <TableCell>
                        <ProgressBar
                          used={b.sickUsed}
                          quota={SICK_LEAVE_QUOTA}
                          tone="sick"
                        />
                      </TableCell>
                      <TableCell>
                        <PredictionCell
                          bal={b}
                          currentMonth={currentMonth}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
