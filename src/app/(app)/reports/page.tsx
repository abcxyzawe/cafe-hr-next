import Image from "next/image";
import dynamicImport from "next/dynamic";
import { Users, Clock, Coffee, Banknote, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS, formatVND, formatHours } from "@/lib/utils";
import { getReportsHeatmap } from "@/lib/reports-heatmap-data";
import { ReportsHeatmap } from "@/components/reports-heatmap";
import { getShiftDistribution } from "@/lib/shift-distribution";
import type { ShiftDistributionPoint } from "@/lib/shift-distribution";
import { ShiftDistributionCard } from "@/components/shift-distribution-card";
import { RoleIllustration } from "@/components/role-illustration";

// Code-split the chart bundle (Recharts ~100KB) — only ship to clients that
// actually render the Reports page, after the rest of the UI loads.
const RolePieChart = dynamicImport(
  () => import("./charts").then((m) => m.RolePieChart),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);
const DailyHoursAreaChart = dynamicImport(
  () => import("./charts").then((m) => m.DailyHoursAreaChart),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);
const TopEarnersBarChart = dynamicImport(
  () => import("./charts").then((m) => m.TopEarnersBarChart),
  { loading: () => <Skeleton className="h-72 w-full" /> },
);
const ShiftDistributionChart = dynamicImport(
  () => import("./charts").then((m) => m.ShiftDistributionChart),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);
const ParetoChart = dynamicImport(
  () => import("@/components/pareto-chart").then((m) => m.ParetoChart),
  { loading: () => <Skeleton className="h-[320px] w-full" /> },
);

export const dynamic = "force-dynamic";

function periodOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function loadData(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [employees, attendance, shifts] = await Promise.all([
    prisma.employee.findMany({ orderBy: { id: "asc" } }),
    prisma.attendance.findMany({
      where: { checkIn: { gte: start, lt: end }, checkOut: { not: null } },
      select: { employeeId: true, checkIn: true, hoursWorked: true },
    }),
    prisma.shift.findMany({
      where: { shiftDate: { gte: start, lt: end } },
      select: { shiftType: true },
    }),
  ]);

  // Role breakdown
  const roleMap = new Map<string, number>();
  for (const e of employees) {
    roleMap.set(e.role, (roleMap.get(e.role) ?? 0) + 1);
  }
  const rolePie = Array.from(roleMap.entries()).map(([role, count]) => ({
    role,
    count,
  }));

  // Daily hours
  const dailyMap = new Map<string, number>();
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dailyMap.set(String(d).padStart(2, "0"), 0);
  }
  for (const a of attendance) {
    const day = String(new Date(a.checkIn).getDate()).padStart(2, "0");
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(a.hoursWorked ?? 0));
  }
  const dailyHours = Array.from(dailyMap.entries()).map(([day, hours]) => ({
    day,
    hours: Number(hours.toFixed(2)),
  }));

  // Top earners
  const hoursByEmp = new Map<number, number>();
  for (const a of attendance) {
    hoursByEmp.set(
      a.employeeId,
      (hoursByEmp.get(a.employeeId) ?? 0) + Number(a.hoursWorked ?? 0),
    );
  }
  const allByPay = employees
    .map((e) => {
      const hours = hoursByEmp.get(e.id) ?? 0;
      const pay = hours * Number(e.hourlyRate);
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        avatarUrl: e.avatarUrl,
        hours: Number(hours.toFixed(2)),
        pay: Number(pay.toFixed(2)),
      };
    })
    .filter((e) => e.pay > 0)
    .sort((a, b) => b.pay - a.pay);

  const earners = allByPay.slice(0, 5);

  // Pareto: cumulative % of total pay across employees sorted desc
  const totalPaySum = allByPay.reduce((s, e) => s + e.pay, 0);
  let runningSum = 0;
  const pareto: { name: string; pay: number; cumPct: number }[] = allByPay.map(
    (e) => {
      runningSum += e.pay;
      const cumPct =
        totalPaySum > 0 ? Number(((runningSum / totalPaySum) * 100).toFixed(2)) : 0;
      return { name: e.name, pay: e.pay, cumPct };
    },
  );

  // Shift distribution
  const shiftMap = new Map<string, number>();
  for (const s of shifts) {
    if (s.shiftType) shiftMap.set(s.shiftType, (shiftMap.get(s.shiftType) ?? 0) + 1);
  }
  const shiftDist = ["morning", "afternoon", "evening"].map((t) => ({
    type: t,
    count: shiftMap.get(t) ?? 0,
  }));

  const totalHours = Array.from(hoursByEmp.values()).reduce((a, b) => a + b, 0);
  const totalPay = employees.reduce((sum, e) => {
    return sum + (hoursByEmp.get(e.id) ?? 0) * Number(e.hourlyRate);
  }, 0);
  const avgHourlyRate =
    employees.length > 0
      ? employees.reduce((s, e) => s + Number(e.hourlyRate), 0) / employees.length
      : 0;

  return {
    rolePie,
    dailyHours,
    earners,
    pareto,
    shiftDist,
    kpi: {
      employees: employees.length,
      totalHours: Number(totalHours.toFixed(2)),
      totalPay: Number(totalPay.toFixed(2)),
      avgHourlyRate: Math.round(avgHourlyRate),
      shifts: shifts.length,
    },
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period =
    sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : periodOf(new Date());

  let data: Awaited<ReturnType<typeof loadData>> | null = null;
  let error: string | null = null;
  try {
    data = await loadData(period);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  let heatmap: Awaited<ReturnType<typeof getReportsHeatmap>> = [];
  try {
    heatmap = await getReportsHeatmap(90);
  } catch {
    heatmap = [];
  }

  let shiftDistribution: ShiftDistributionPoint[] = [];
  try {
    shiftDistribution = await getShiftDistribution(8);
  } catch {
    shiftDistribution = [];
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Không tải được dữ liệu</CardTitle>
          <CardDescription className="text-destructive/80">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isEmpty =
    data.kpi.employees === 0 &&
    data.kpi.shifts === 0 &&
    data.kpi.totalHours === 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={Users} label="Nhân viên" value={data.kpi.employees} />
        <KpiCard icon={Clock} label="Tổng giờ" value={formatHours(data.kpi.totalHours)} />
        <KpiCard
          icon={Banknote}
          label="Tổng lương"
          value={formatVND(data.kpi.totalPay)}
          accent
        />
        <KpiCard icon={Coffee} label="Ca trong kỳ" value={data.kpi.shifts} />
        <KpiCard
          icon={TrendingUp}
          label="Lương/giờ TB"
          value={formatVND(data.kpi.avgHourlyRate)}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Báo cáo kỳ {period}</CardTitle>
            <CardDescription>Phân tích nhân sự & lương theo tháng</CardDescription>
          </div>
          <form action="/reports">
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm dark:[color-scheme:dark]"
            />
          </form>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lưu lượng 90 ngày qua</CardTitle>
          <CardDescription>
            Mỗi ô là một ngày · màu càng đậm = càng nhiều check-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsHeatmap data={heatmap} days={90} />
        </CardContent>
      </Card>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="relative size-44 overflow-hidden rounded-lg opacity-90">
              <Image
                src="/assets/empty-payroll.jpg"
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Kỳ này chưa có dữ liệu — thêm nhân viên, lập ca và chấm công để xem báo cáo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Cơ cấu vai trò</CardTitle>
              <CardDescription>Phân bố nhân viên theo vị trí</CardDescription>
            </CardHeader>
            <CardContent>
              {data.rolePie.length > 0 ? (
                <div className="space-y-4">
                  <RolePieChart data={data.rolePie} />
                  <ul className="space-y-2">
                    {data.rolePie.map((r) => (
                      <li
                        key={r.role}
                        className="flex items-center gap-3 rounded-lg border bg-card/50 p-2"
                      >
                        <RoleIllustration role={r.role} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {ROLE_LABELS[r.role] ?? r.role}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.count} nhân viên
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Chưa có nhân viên</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phân bố ca làm</CardTitle>
              <CardDescription>Số ca theo loại trong kỳ</CardDescription>
            </CardHeader>
            <CardContent>
              <ShiftDistributionChart data={data.shiftDist} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 nhân viên</CardTitle>
              <CardDescription>Thực lĩnh cao nhất kỳ {period}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.earners.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Chưa có giờ làm</p>
              ) : (
                data.earners.map((e, i) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="w-5 font-mono text-xs text-muted-foreground">
                      #{i + 1}
                    </span>
                    <Avatar src={e.avatarUrl} alt={e.name} fallback={e.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[e.role]} · {formatHours(e.hours)}
                      </p>
                    </div>
                    <Badge variant="success">{formatVND(e.pay)}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Giờ làm theo ngày</CardTitle>
              <CardDescription>
                Tổng giờ check-in theo từng ngày trong kỳ {period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DailyHoursAreaChart data={data.dailyHours} />
            </CardContent>
          </Card>

          <ShiftDistributionCard data={shiftDistribution} />

          {data.earners.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>So sánh thực lĩnh</CardTitle>
                <CardDescription>Top 5 nhân viên có lương cao nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <TopEarnersBarChart
                  data={data.earners.map((e) => ({
                    name: e.name,
                    pay: e.pay,
                    role: e.role,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {data.pareto.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Phân bổ lương kỳ này (Pareto)</CardTitle>
                <CardDescription>
                  Sắp xếp giảm dần theo lương — đường biểu thị phần trăm tích lũy. Tại
                  80% là ngưỡng Pareto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ParetoChart data={data.pareto} />
              </CardContent>
            </Card>
          )}
        </section>
      )}
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
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex size-10 items-center justify-center rounded-xl ${
            accent ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
          }`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-lg font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
