import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Banknote,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
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
import {
  ROLE_LABELS,
  formatVND,
  formatHours,
  formatDateTime,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalarySlipPage({
  params,
}: {
  params: Promise<{ period: string; id: string }>;
}) {
  const { period, id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();
  if (!/^\d{4}-\d{2}$/.test(period)) notFound();

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [attendance, shifts] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId: id,
        checkIn: { gte: start, lt: end },
      },
      orderBy: { checkIn: "asc" },
    }),
    prisma.shift.count({
      where: { employeeId: id, shiftDate: { gte: start, lt: end } },
    }),
  ]);

  // Group attendance by day
  type DayRow = {
    day: string;
    sessions: Array<{
      id: number;
      checkIn: Date;
      checkOut: Date | null;
      hours: number;
    }>;
    totalHours: number;
  };
  const dayMap = new Map<string, DayRow>();
  for (const a of attendance) {
    const dayIso = new Date(a.checkIn).toISOString().slice(0, 10);
    const cur = dayMap.get(dayIso) ?? { day: dayIso, sessions: [], totalHours: 0 };
    const hours = Number(a.hoursWorked ?? 0);
    cur.sessions.push({
      id: a.id,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hours,
    });
    cur.totalHours += hours;
    dayMap.set(dayIso, cur);
  }
  const days = Array.from(dayMap.values()).sort((a, b) =>
    a.day.localeCompare(b.day),
  );

  const rate = Number(employee.hourlyRate);
  const totalHours = days.reduce((a, d) => a + d.totalHours, 0);
  const totalPay = totalHours * rate;
  const openSessions = attendance.filter((a) => !a.checkOut).length;
  const daysInMonth = new Date(year, month, 0).getDate();
  const workDays = days.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/payroll?period=${period}`}>
            <ArrowLeft className="size-4" />
            Quay lại bảng lương
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/api/payroll/${period}/export`} prefetch={false}>
              <FileSpreadsheet className="size-4" />
              Excel cả kỳ
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/payroll/${period}/print`} target="_blank" prefetch={false}>
              <Printer className="size-4" />
              In bảng lương
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar
              src={employee.avatarUrl}
              alt={employee.name}
              fallback={employee.name}
              size={64}
            />
            <div>
              <CardTitle className="text-2xl">{employee.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="secondary">{ROLE_LABELS[employee.role]}</Badge>
                <span>·</span>
                <span>Phiếu lương kỳ {period}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              icon={Calendar}
              label="Ngày làm"
              value={`${workDays}/${daysInMonth}`}
            />
            <KPI
              icon={Clock}
              label="Tổng giờ"
              value={formatHours(totalHours)}
            />
            <KPI
              icon={Banknote}
              label="Lương/giờ"
              value={formatVND(rate)}
            />
            <KPI
              icon={Banknote}
              label="Thực lĩnh"
              value={formatVND(totalPay)}
              accent
            />
          </div>
          {openSessions > 0 && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              ⚠ Có {openSessions} ca chưa check-out — chưa được tính giờ.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Tổng số ca đã lên lịch trong kỳ: <strong>{shifts}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo ngày</CardTitle>
          <CardDescription>
            Mỗi ngày có thể có nhiều phiên check-in / check-out
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {days.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nhân viên này chưa có lượt chấm công nào trong kỳ {period}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Phiên</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead className="text-right">Giờ</TableHead>
                  <TableHead className="text-right">Lương</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.flatMap((d) =>
                  d.sessions.map((s, sIdx) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-medium">
                        {sIdx === 0 && (
                          <>
                            {new Date(d.day).toLocaleDateString("vi-VN", {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        #{sIdx + 1}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(s.checkIn)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.checkOut ? (
                          formatDateTime(s.checkOut)
                        ) : (
                          <Badge variant="warning">Chưa check-out</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {s.hours > 0 ? formatHours(s.hours) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {s.hours > 0 ? formatVND(s.hours * rate) : "—"}
                      </TableCell>
                    </TableRow>
                  )),
                )}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4} className="text-right uppercase tracking-wide">
                    Tổng cộng
                  </TableCell>
                  <TableCell className="text-right">
                    {formatHours(totalHours)}
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    {formatVND(totalPay)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div
        className={`flex size-10 items-center justify-center rounded-lg ${
          accent
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}
