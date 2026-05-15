import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Banknote,
  Calendar,
  Clock,
  Sparkles,
  Cake,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ClickableAvatar } from "@/components/avatar-lightbox";
import { Button } from "@/components/ui/button";
import {
  ROLE_LABELS,
  SHIFT_LABELS,
  formatVND,
  formatHours,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import { StickyNote, History } from "lucide-react";
import { GenerateAvatarButton } from "../employee-actions";
import { UploadAvatarButton } from "../upload-avatar-button";
import { MonthlyEarningsChart } from "./monthly-chart";
import { NotesSection } from "./notes-section";
import { PIN_MARKER } from "./notes-constants";
import { AttendanceHeatmap } from "./attendance-heatmap";
import { PinButton } from "./pin-button";
import { EmployeeTimeline } from "./employee-timeline";
import { PerformanceCard } from "./performance-card";
import { getPerformanceMetrics } from "@/lib/performance";
import { getPerformanceTrend } from "@/lib/performance-trend";
import { PerformanceTrendChart } from "./performance-trend-chart";
import { KudosSection, type KudosItem } from "./kudos-section";
import { SalaryHistoryCard } from "./salary-history-card";
import { getSalaryHistory } from "@/lib/salary-history";
import { GiveKudosDialog } from "@/components/give-kudos-dialog";
import { BirthdayCardDialog } from "./birthday-card-dialog";
import { HoursGoalTracker } from "@/components/hours-goal-tracker";
import { ForecastChip } from "@/components/forecast-chip";
import { computeMonthForecast } from "@/lib/month-forecast";
import { TrackVisit } from "./track-visit";
import { DuplicateButton } from "./duplicate-button";
import { StreakBadge } from "@/components/streak-badge";
import { getStreakForEmployee } from "@/lib/streak-queries";
import { TenureChip } from "@/components/tenure-chip";
import { AchievementGrid } from "@/components/achievement-grid";
import { getEarnedBadges } from "@/lib/achievement-queries";
import type { AchievementKey } from "@/lib/achievements";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  barista: "default",
  server: "secondary",
  cashier: "warning",
  manager: "success",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const sess = await getSession();
  const isAdmin = sess?.role === "admin";

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // For heatmap: last 365 days
  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365);
  yearAgo.setHours(0, 0, 0, 0);

  const [attendance, shifts, totalAttendance, notes, yearAttendance, activities, perfMetrics, perfTrend, kudosLogs, salaryHistory] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: id },
      orderBy: { checkIn: "desc" },
      take: 20,
    }),
    prisma.shift.findMany({
      where: { employeeId: id, shiftDate: { gte: sixMonthsAgo } },
      orderBy: { shiftDate: "desc" },
      take: 30,
    }),
    prisma.attendance.findMany({
      where: { employeeId: id, checkIn: { gte: sixMonthsAgo }, checkOut: { not: null } },
      select: { checkIn: true, hoursWorked: true },
    }),
    prisma.employeeNote.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.attendance.findMany({
      where: {
        employeeId: id,
        checkIn: { gte: yearAgo },
        checkOut: { not: null },
      },
      select: { checkIn: true, hoursWorked: true },
    }),
    prisma.activityLog.findMany({
      where: { entityType: "employee", entityId: id },
      orderBy: { id: "desc" },
      take: 30,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    getPerformanceMetrics(id),
    getPerformanceTrend(id, 6),
    prisma.activityLog.findMany({
      where: { action: "kudos.give", entityType: "employee", entityId: id },
      orderBy: { id: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    getSalaryHistory(id),
  ]);

  const streak = await getStreakForEmployee(id);

  let earnedBadges: AchievementKey[] = [];
  try {
    earnedBadges = await getEarnedBadges(id);
  } catch {
    earnedBadges = [];
  }

  const kudosCount = kudosLogs.length;
  const parsedKudos: KudosItem[] = kudosLogs.map((log) => {
    const meta =
      log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? (log.metadata as Record<string, unknown>)
        : null;
    const emoji =
      meta && typeof meta.emoji === "string" && meta.emoji.length > 0 ? meta.emoji : "⭐";
    const message =
      meta && typeof meta.message === "string" ? meta.message : log.summary;
    const senderName = log.user?.name ?? "Hệ thống";
    return {
      id: log.id,
      emoji,
      message,
      senderName,
      createdAt: log.createdAt,
    };
  });

  // Aggregate hours per day for heatmap
  const dailyMap = new Map<string, number>();
  for (const a of yearAttendance) {
    const iso = new Date(a.checkIn).toISOString().slice(0, 10);
    dailyMap.set(iso, (dailyMap.get(iso) ?? 0) + Number(a.hoursWorked ?? 0));
  }
  const heatmapData = Array.from(dailyMap.entries()).map(([iso, hours]) => ({
    iso,
    hours,
  }));

  // Monthly aggregation
  const rate = Number(employee.hourlyRate);
  const monthlyMap = new Map<string, { hours: number; pay: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { hours: 0, pay: 0 });
  }
  for (const a of totalAttendance) {
    const d = new Date(a.checkIn);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = monthlyMap.get(key);
    if (cur) {
      const h = Number(a.hoursWorked ?? 0);
      cur.hours += h;
      cur.pay += h * rate;
    }
  }
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({
    month: month.slice(5) + "/" + month.slice(2, 4),
    hours: Number(v.hours.toFixed(2)),
    pay: Number(v.pay.toFixed(2)),
  }));
  const lifetimeHours = totalAttendance.reduce(
    (a, b) => a + Number(b.hoursWorked ?? 0),
    0,
  );
  const lifetimePay = lifetimeHours * rate;
  const openShift = attendance.find((a) => !a.checkOut);

  // Current calendar month hours (for the monthly goal tracker)
  const nowForMonth = new Date();
  const startOfCurrentMonth = new Date(
    nowForMonth.getFullYear(),
    nowForMonth.getMonth(),
    1,
  );
  const startOfNextMonth = new Date(
    nowForMonth.getFullYear(),
    nowForMonth.getMonth() + 1,
    1,
  );
  const startOfLastMonth = new Date(
    nowForMonth.getFullYear(),
    nowForMonth.getMonth() - 1,
    1,
  );
  const sumHoursInRange = (start: Date, end: Date): number =>
    totalAttendance.reduce((acc, a) => {
      const d = new Date(a.checkIn);
      if (d >= start && d < end) {
        return acc + Number(a.hoursWorked ?? 0);
      }
      return acc;
    }, 0);
  const currentMonthHours = sumHoursInRange(startOfCurrentMonth, startOfNextMonth);
  const lastMonthHours = sumHoursInRange(startOfLastMonth, startOfCurrentMonth);
  const currentMonthPay = currentMonthHours * rate;
  const lastMonthPay = lastMonthHours * rate;
  const computeDelta = (current: number, previous: number): number | null => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  const hoursDelta = computeDelta(currentMonthHours, lastMonthHours);
  const payDelta = computeDelta(currentMonthPay, lastMonthPay);
  const monthForecast = computeMonthForecast(
    currentMonthHours,
    lastMonthHours,
    nowForMonth,
  );

  const nowForPeriod = new Date();
  const currentPeriod = `${nowForPeriod.getFullYear()}-${String(nowForPeriod.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <TrackVisit
        id={employee.id}
        name={employee.name}
        avatarUrl={employee.avatarUrl}
        role={employee.role}
      />
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/employees">
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <GiveKudosDialog employeeId={id} employeeName={employee.name} />
          )}
          {isAdmin && (
            <BirthdayCardDialog
              employeeId={id}
              employeeName={employee.name}
            />
          )}
          {isAdmin && <DuplicateButton id={id} name={employee.name} />}
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/employees/${id}/payslip/${currentPeriod}`}
              target="_blank"
              prefetch={false}
            >
              In phiếu lương
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/employees/${id}/print`}
              target="_blank"
              prefetch={false}
            >
              In hồ sơ
            </Link>
          </Button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border">
        <div className="relative h-40 w-full md:h-52">
          <Image
            src="/assets/profile-banner.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        </div>
        <div className="-mt-16 flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-end md:gap-6 md:px-8">
          <div className="rounded-full border-4 border-card bg-card shadow-lg">
            <ClickableAvatar
              src={employee.avatarUrl}
              name={employee.name}
              role={employee.role}
              size={120}
            />
          </div>
          <div className="flex-1 md:pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {employee.name}
              </h1>
              <Badge variant={ROLE_VARIANT[employee.role] ?? "secondary"}>
                {ROLE_LABELS[employee.role] ?? employee.role}
              </Badge>
              {openShift && (
                <Badge variant="success" className="gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang trong ca
                </Badge>
              )}
              <StreakBadge
                current={streak.currentStreak}
                longest={streak.longestStreak}
              />
              <TenureChip start={employee.createdAt} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {employee.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {employee.email}
                </span>
              )}
              {employee.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {employee.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Banknote className="size-3.5" />
                {formatVND(rate)}/giờ
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Tham gia: {formatDate(employee.createdAt)}
              </span>
              {employee.dateOfBirth && (
                <span className="flex items-center gap-1.5">
                  <Cake className="size-3.5" />
                  Sinh nhật: {formatDate(employee.dateOfBirth)}
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-1 md:pb-2">
              <GenerateAvatarButton id={employee.id} />
              <UploadAvatarButton id={employee.id} />
              <PinButton employeeId={employee.id} hasPin={!!employee.pinHash} />
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatBlock
          icon={Clock}
          label="Giờ tháng này"
          value={formatHours(currentMonthHours)}
          delta={hoursDelta}
          subtitle={`6 tháng: ${formatHours(lifetimeHours)}`}
        />
        <StatBlock
          icon={Banknote}
          label="Thu nhập tháng này"
          value={formatVND(currentMonthPay)}
          delta={payDelta}
          subtitle={`6 tháng: ${formatVND(lifetimePay)}`}
          accent
        />
        <StatBlock
          icon={Sparkles}
          label="Trạng thái"
          value={openShift ? "Đang làm" : "Nghỉ"}
        />
      </section>

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <ForecastChip forecast={monthForecast} />
      </div>

      <HoursGoalTracker
        employeeId={id}
        currentHours={Number(currentMonthHours.toFixed(2))}
        editable={isAdmin}
      />

      <PerformanceCard metrics={perfMetrics} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            Huy hiệu
          </CardTitle>
          <CardDescription>
            Thành tích đã đạt được dựa trên dữ liệu chấm công, lịch ca và lượt khen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AchievementGrid earned={earnedBadges} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xu hướng hiệu suất 6 tháng</CardTitle>
          <CardDescription>
            Số giờ làm, độ tin cậy (đi làm/đã xếp ca) và đúng giờ theo từng tháng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceTrendChart data={perfTrend} />
        </CardContent>
      </Card>

      <SalaryHistoryCard items={salaryHistory} currentRate={rate} />

      <KudosSection
        items={parsedKudos.slice(0, 5)}
        count={kudosCount}
        employeeId={id}
      />

      <Card>
        <CardHeader>
          <CardTitle>Hoạt động 365 ngày qua</CardTitle>
          <CardDescription>
            Mỗi ô là một ngày · màu càng đậm = càng nhiều giờ làm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceHeatmap data={heatmapData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thu nhập 6 tháng gần nhất</CardTitle>
          <CardDescription>Số giờ làm và thực lĩnh theo tháng</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyEarningsChart data={monthlyData} />
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chấm công gần đây</CardTitle>
            <CardDescription>20 lượt check-in / out gần nhất</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {attendance.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Chưa có dữ liệu chấm công
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead className="text-right">Giờ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{formatDateTime(a.checkIn)}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(a.checkOut)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {a.hoursWorked ? formatHours(Number(a.hoursWorked)) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lịch ca gần đây</CardTitle>
            <CardDescription>30 ca trong 6 tháng qua</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {shifts.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Chưa có ca nào
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Ca</TableHead>
                    <TableHead className="text-right">Giờ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{formatDate(s.shiftDate)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {s.shiftType ? SHIFT_LABELS[s.shiftType] : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {s.startTime}–{s.endTime}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="size-5" />
            Ghi chú nội bộ ({notes.length})
          </CardTitle>
          <CardDescription>
            Ghi chú về nhân viên — chỉ người trong hệ thống thấy được
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotesSection
            employeeId={id}
            notes={notes
              .map((n) => {
                const pinned = n.content.startsWith(PIN_MARKER);
                return {
                  id: n.id,
                  authorId: n.authorId,
                  authorName: n.authorName,
                  content: pinned ? n.content.slice(PIN_MARKER.length) : n.content,
                  createdAt: n.createdAt,
                  pinned,
                };
              })
              .sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return b.createdAt.getTime() - a.createdAt.getTime();
              })}
            currentUserId={sess?.uid ?? 0}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Lịch sử hoạt động ({activities.length})
          </CardTitle>
          <CardDescription>
            Tất cả thao tác đã làm trên hồ sơ nhân viên này
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeTimeline
            employeeId={id}
            initial={activities.map((a) => ({
              id: a.id,
              action: a.action,
              summary: a.summary,
              createdAt: a.createdAt,
              user: a.user,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  accent,
  delta,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
  delta?: number | null;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div
          className={`flex size-12 items-center justify-center rounded-xl ${
            accent ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
          }`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold leading-tight">{value}</p>
          {delta !== undefined && <DeltaChip delta={delta} />}
          {subtitle && (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        <span aria-hidden>■</span>
        <span>chưa có dữ liệu tháng trước</span>
      </span>
    );
  }
  // Threshold: |delta| < 1% counts as flat
  const isFlat = Math.abs(delta) < 1;
  const isUp = !isFlat && delta > 0;
  const isDown = !isFlat && delta < 0;
  const arrow = isFlat ? "■" : isUp ? "▲" : "▼";
  const colorClass = isFlat
    ? "bg-muted text-muted-foreground"
    : isUp
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  const sign = isUp ? "+" : isDown ? "" : "";
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${colorClass}`}
    >
      <span aria-hidden>{arrow}</span>
      <span>
        {sign}
        {delta.toFixed(0)}% vs tháng trước
      </span>
    </span>
  );
}
