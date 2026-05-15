import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVND, formatHours } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { PayrollChart } from "./payroll-chart";
import { PayrollBulkActions, type PayrollRowVM } from "./payroll-bulk-actions";
import { WhatIfPayrollTool } from "./what-if-tool";
import { DeductionsConfigButton } from "./deductions-config-button";
import { getPaidPayrollIds } from "./actions";
import { PayrollComparisonCard } from "@/components/payroll-comparison-card";
import {
  getPeriodComparison,
  type PayrollPeriodTotals,
} from "@/lib/payroll-comparison";

export const dynamic = "force-dynamic";

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : currentPeriod();
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  let rows: Array<{
    employee_id: number;
    name: string;
    role: string;
    hourly_rate: number;
    avatar_url: string | null;
    total_hours: number;
    total_pay: number;
  }> = [];
  let error: string | null = null;

  try {
    const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
    const attendance = await prisma.attendance.findMany({
      where: {
        checkIn: { gte: start, lt: end },
        checkOut: { not: null },
      },
      select: { employeeId: true, hoursWorked: true },
    });
    const hoursByEmp = new Map<number, number>();
    for (const a of attendance) {
      const cur = hoursByEmp.get(a.employeeId) ?? 0;
      hoursByEmp.set(a.employeeId, cur + Number(a.hoursWorked ?? 0));
    }
    rows = employees.map((e) => {
      const hours = hoursByEmp.get(e.id) ?? 0;
      const rate = Number(e.hourlyRate);
      return {
        employee_id: e.id,
        name: e.name,
        role: e.role,
        hourly_rate: rate,
        avatar_url: e.avatarUrl,
        total_hours: Number(hours.toFixed(2)),
        total_pay: Number((hours * rate).toFixed(2)),
      };
    });

    // Persist snapshot
    await Promise.all(
      rows.map((r) =>
        prisma.payroll.upsert({
          where: { employeeId_period: { employeeId: r.employee_id, period } },
          create: {
            employeeId: r.employee_id,
            period,
            totalHours: r.total_hours,
            totalPay: r.total_pay,
          },
          update: {
            totalHours: r.total_hours,
            totalPay: r.total_pay,
            generatedAt: new Date(),
          },
        }),
      ),
    );
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Load saved payroll IDs for this period (so we can pass them to the bulk
  // action client component) and figure out which ones are already marked paid.
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const payrollRecords = await prisma.payroll
    .findMany({
      where: { period },
      select: { id: true, employeeId: true },
    })
    .catch(() => [] as Array<{ id: number; employeeId: number }>);
  const payrollIdByEmployee = new Map<number, number>();
  for (const p of payrollRecords) {
    payrollIdByEmployee.set(p.employeeId, p.id);
  }
  const paidIds = await getPaidPayrollIds(payrollRecords.map((p) => p.id)).catch(
    () => new Set<number>(),
  );

  const tableRows: PayrollRowVM[] = rows.map((r) => {
    const payrollId = payrollIdByEmployee.get(r.employee_id) ?? null;
    return {
      payrollId,
      employeeId: r.employee_id,
      name: r.name,
      role: r.role,
      hourlyRate: r.hourly_rate,
      avatarUrl: r.avatar_url,
      totalHours: r.total_hours,
      totalPay: r.total_pay,
      paid: payrollId !== null && paidIds.has(payrollId),
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.hours += r.total_hours;
      acc.pay += r.total_pay;
      return acc;
    },
    { hours: 0, pay: 0 },
  );

  let comparison:
    | { current: PayrollPeriodTotals; previous: PayrollPeriodTotals }
    | null = null;
  try {
    comparison = await getPeriodComparison(period);
  } catch {
    comparison = null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Bảng lương kỳ {period}</CardTitle>
            <CardDescription>
              Tổng: {rows.length} nhân viên · {formatHours(totals.hours)} ·{" "}
              <span className="font-semibold text-primary">{formatVND(totals.pay)}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <form action="/payroll">
              <input
                type="month"
                name="period"
                defaultValue={period}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm dark:[color-scheme:dark]"
              />
            </form>
            {rows.length > 0 && (
              <>
                <DeductionsConfigButton isAdmin={isAdmin} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/payroll/${period}/print`} target="_blank" prefetch={false}>
                    <Printer className="size-4" />
                    In
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/api/payroll/${period}/export`} prefetch={false}>
                    <Download className="size-4" />
                    Excel
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/api/payroll/${period}/csv`} prefetch={false}>
                    <Download className="size-4" />
                    CSV
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : (
            <PayrollBulkActions
              rows={tableRows}
              period={period}
              isAdmin={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      {comparison && (
        <PayrollComparisonCard
          current={comparison.current}
          previous={comparison.previous}
        />
      )}

      {rows.length > 0 && isAdmin && (
        <WhatIfPayrollTool
          rows={rows.map((r) => ({
            id: r.employee_id,
            name: r.name,
            hours: r.total_hours,
            hourlyRate: r.hourly_rate,
            total_pay: r.total_pay,
          }))}
        />
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ lương kỳ {period}</CardTitle>
            <CardDescription>So sánh thực lĩnh theo nhân viên</CardDescription>
          </CardHeader>
          <CardContent>
            <PayrollChart data={rows.map((r) => ({ name: r.name, pay: r.total_pay }))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
