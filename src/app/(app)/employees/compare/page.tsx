import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, Banknote } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { ClickableAvatar } from "@/components/avatar-lightbox";
import { ROLE_LABELS, formatVND, formatHours, cn } from "@/lib/utils";
import { getPerformanceMetrics } from "@/lib/performance";
import { getCompareMetrics } from "@/lib/compare-metrics-queries";
import type { EmployeeMetrics } from "@/lib/compare-metrics";
import { CompareRadarCard } from "@/components/compare-radar-card";
import { PerfReviewDialog } from "@/components/perf-review-dialog";

export const dynamic = "force-dynamic";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  barista: "default",
  server: "secondary",
  cashier: "warning",
  manager: "success",
};

type CompareData = {
  employee: {
    id: number;
    name: string;
    email: string | null;
    role: string;
    avatarUrl: string | null;
    hourlyRate: number;
  };
  monthHours: number;
  lifetimeHours: number;
  kudosCount: number;
  reliabilityPct: number | null;
  currentStreak: number;
  longestStreak: number;
  avgShiftHours: number;
  punctualityPct: { onTime: number; late: number };
};

async function loadCompareData(id: number): Promise<CompareData | null> {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [perfMetrics, monthAttendance, lifetimeAttendance, kudosCount] =
    await Promise.all([
      getPerformanceMetrics(id),
      prisma.attendance.findMany({
        where: {
          employeeId: id,
          checkIn: { gte: monthStart, lt: nextMonth },
          checkOut: { not: null },
        },
        select: { hoursWorked: true },
      }),
      prisma.attendance.findMany({
        where: {
          employeeId: id,
          checkIn: { gte: sixMonthsAgo },
          checkOut: { not: null },
        },
        select: { hoursWorked: true },
      }),
      prisma.activityLog.count({
        where: { action: "kudos.give", entityType: "employee", entityId: id },
      }),
    ]);

  const monthHours = monthAttendance.reduce(
    (acc, a) => acc + Number(a.hoursWorked ?? 0),
    0,
  );
  const lifetimeHours = lifetimeAttendance.reduce(
    (acc, a) => acc + Number(a.hoursWorked ?? 0),
    0,
  );
  const totalP =
    perfMetrics.punctuality.early +
    perfMetrics.punctuality.onTime +
    perfMetrics.punctuality.late;
  const onTimePct =
    totalP === 0
      ? 0
      : Math.round(
          ((perfMetrics.punctuality.onTime + perfMetrics.punctuality.early) /
            totalP) *
            100,
        );
  const latePct =
    totalP === 0 ? 0 : Math.round((perfMetrics.punctuality.late / totalP) * 100);

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      avatarUrl: employee.avatarUrl,
      hourlyRate: Number(employee.hourlyRate),
    },
    monthHours,
    lifetimeHours,
    kudosCount,
    reliabilityPct: perfMetrics.reliabilityPct,
    currentStreak: perfMetrics.currentStreak,
    longestStreak: perfMetrics.longestStreak,
    avgShiftHours: perfMetrics.avgShiftHours,
    punctualityPct: { onTime: onTimePct, late: latePct },
  };
}

function parseIds(raw: string | undefined): number[] | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const ids: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n <= 0) return null;
    if (!ids.includes(n)) ids.push(n);
  }
  if (ids.length < 2 || ids.length > 4) return null;
  return ids;
}

function InvalidState() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/employees">
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Cần chọn 2 tới 4 nhân viên để so sánh</CardTitle>
          <CardDescription>
            Truyền tham số{" "}
            <code className="rounded bg-muted px-1">?ids=ID1,ID2,...</code> trong
            URL (tối đa 4 ID) hoặc chọn 2-4 nhân viên ở trang danh sách rồi bấm
            “So sánh”.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/employees">Tới danh sách nhân viên</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type Comparator = "higher" | "lower";

type MetricRow = {
  label: string;
  raws: number[];
  displays: string[];
  better: Comparator;
};

const WINNER_CLASS =
  "bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200";
const LOSER_CLASS =
  "bg-rose-50/60 text-muted-foreground dark:bg-rose-950/30";

function highlightRow(raws: number[], better: Comparator): string[] {
  const n = raws.length;
  const classes = new Array<string>(n).fill("");
  if (n < 2) return classes;
  const allSame = raws.every((v) => v === raws[0]);
  if (allSame) return classes;

  const max = Math.max(...raws);
  const min = Math.min(...raws);
  if (max === min) return classes;

  const winnerVal = better === "higher" ? max : min;
  const loserVal = better === "higher" ? min : max;
  const winners = raws.filter((v) => v === winnerVal).length;
  const losers = raws.filter((v) => v === loserVal).length;

  for (let i = 0; i < n; i++) {
    if (raws[i] === winnerVal && winners === 1) classes[i] = WINNER_CLASS;
    else if (raws[i] === loserVal && losers === 1) classes[i] = LOSER_CLASS;
  }
  return classes;
}

const HEADER_GRID_CLASS: Record<number, string> = {
  2: "grid gap-4 sm:grid-cols-2",
  3: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
};

const LETTERS = ["A", "B", "C", "D"];

export default async function CompareEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const ids = parseIds(sp.ids);
  if (!ids) return <InvalidState />;

  const loaded = await Promise.all(ids.map((id) => loadCompareData(id)));
  const datas: CompareData[] = [];
  for (const d of loaded) {
    if (!d) return <InvalidState />;
    datas.push(d);
  }

  let radarMetrics: EmployeeMetrics[] = [];
  try {
    radarMetrics = await getCompareMetrics(datas.map((d) => d.employee.id));
  } catch {
    radarMetrics = [];
  }

  const rows: MetricRow[] = [
    {
      label: "Lương / giờ",
      raws: datas.map((d) => d.employee.hourlyRate),
      displays: datas.map((d) => formatVND(d.employee.hourlyRate)),
      better: "higher",
    },
    {
      label: "Tổng giờ tháng này",
      raws: datas.map((d) => d.monthHours),
      displays: datas.map((d) => formatHours(d.monthHours)),
      better: "higher",
    },
    {
      label: "Tổng giờ 6 tháng",
      raws: datas.map((d) => d.lifetimeHours),
      displays: datas.map((d) => formatHours(d.lifetimeHours)),
      better: "higher",
    },
    {
      label: "Độ tin cậy",
      raws: datas.map((d) => d.reliabilityPct ?? -1),
      displays: datas.map((d) =>
        d.reliabilityPct == null ? "—" : `${d.reliabilityPct}%`,
      ),
      better: "higher",
    },
    {
      label: "Streak hiện tại",
      raws: datas.map((d) => d.currentStreak),
      displays: datas.map((d) => `${d.currentStreak} ngày`),
      better: "higher",
    },
    {
      label: "Streak kỷ lục",
      raws: datas.map((d) => d.longestStreak),
      displays: datas.map((d) => `${d.longestStreak} ngày`),
      better: "higher",
    },
    {
      label: "Giờ TB mỗi ca",
      raws: datas.map((d) => d.avgShiftHours),
      displays: datas.map((d) => formatHours(d.avgShiftHours)),
      better: "higher",
    },
    {
      label: "Đúng giờ",
      raws: datas.map((d) => d.punctualityPct.onTime),
      displays: datas.map((d) => `${d.punctualityPct.onTime}%`),
      better: "higher",
    },
    {
      label: "Trễ %",
      raws: datas.map((d) => d.punctualityPct.late),
      displays: datas.map((d) => `${d.punctualityPct.late}%`),
      better: "lower",
    },
    {
      label: "Số lời khen",
      raws: datas.map((d) => d.kudosCount),
      displays: datas.map((d) => `${d.kudosCount}`),
      better: "higher",
    },
  ];

  const headerGridClass = HEADER_GRID_CLASS[datas.length] ?? HEADER_GRID_CLASS[2];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/employees">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Đổi nhân viên: thêm{" "}
            <code className="rounded bg-muted px-1">?ids=X,Y,...</code> vào URL
            (2-4 nhân viên)
          </p>
          {sess.role === "admin" && <PerfReviewDialog />}
        </div>
      </div>

      <section className={headerGridClass}>
        {datas.map((d, idx) => (
          <Card key={d.employee.id}>
            <CardHeader>
              <CardDescription className="uppercase tracking-wide">
                Nhân viên {LETTERS[idx] ?? idx + 1}
              </CardDescription>
              <div className="flex items-center gap-4 pt-2">
                <ClickableAvatar
                  src={d.employee.avatarUrl}
                  name={d.employee.name}
                  role={d.employee.role}
                  href={`/employees/${d.employee.id}`}
                  size={88}
                />
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-xl">
                    <Link
                      href={`/employees/${d.employee.id}`}
                      className="hover:underline"
                    >
                      {d.employee.name}
                    </Link>
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={ROLE_VARIANT[d.employee.role] ?? "secondary"}>
                      {ROLE_LABELS[d.employee.role] ?? d.employee.role}
                    </Badge>
                    {d.employee.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3.5" />
                        {d.employee.email}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Banknote className="size-3.5" />
                    {formatVND(d.employee.hourlyRate)}/giờ
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <CompareRadarCard metrics={radarMetrics} />

      <Card>
        <CardHeader>
          <CardTitle>Bảng so sánh</CardTitle>
          <CardDescription>
            Ô màu xanh = giá trị tốt nhất, ô hồng = kém nhất. Khi có hoà, không
            tô màu. Với chỉ số “Trễ %”, càng thấp càng tốt.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Chỉ số</TableHead>
                {datas.map((d) => (
                  <TableHead key={d.employee.id} className="text-right">
                    {d.employee.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const cellClasses = highlightRow(row.raws, row.better);
                return (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {row.displays.map((val, i) => (
                      <TableCell
                        key={i}
                        className={cn(
                          "text-right tabular-nums",
                          cellClasses[i],
                        )}
                      >
                        {val}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
