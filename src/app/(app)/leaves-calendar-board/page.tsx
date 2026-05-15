import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { KPIStat } from "@/components/kpi-stat";
import { LiveCounter } from "@/components/live-counter";
import { TimeAgo } from "@/components/time-ago";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lịch nghỉ phép — Cafe HR",
};

type LeaveTypeKey = "annual" | "sick" | "personal" | "unpaid";

type DayLeave = {
  id: number;
  employeeId: number;
  employeeName: string;
  role: string;
  type: LeaveTypeKey;
  status: "approved";
  isStart: boolean;
  isEnd: boolean;
  isContinuation: boolean;
};

type DayCell = {
  iso: string;
  weekday: number;
  dayOfMonth: number;
  inTargetMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
  leaves: DayLeave[];
  count: number;
  isVietHoliday: boolean;
  holidayName?: string;
};

type Summary = {
  totalApprovedDays: number;
  byType: Record<LeaveTypeKey, number>;
  peakDay: { iso: string; count: number } | null;
  coverageWarnings: string[];
};

type CalendarResponse = {
  ok: true;
  generatedAt: string;
  targetMonth: string;
  gridStartIso: string;
  gridEndIso: string;
  weeks: number;
  summary: Summary;
  days: DayCell[];
};

const MONTH_REGEX = /^\d{4}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseMonth(raw: string | undefined, now: Date): {
  ym: string;
  year: number;
  monthIdx0: number;
  valid: boolean;
} {
  if (raw && MONTH_REGEX.test(raw)) {
    const [yStr, mStr] = raw.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (
      Number.isFinite(y) &&
      Number.isFinite(m) &&
      m >= 1 &&
      m <= 12 &&
      y >= 1970 &&
      y <= 9999
    ) {
      return {
        ym: `${y}-${pad2(m)}`,
        year: y,
        monthIdx0: m - 1,
        valid: true,
      };
    }
  }
  const y = now.getFullYear();
  const m0 = now.getMonth();
  return {
    ym: `${y}-${pad2(m0 + 1)}`,
    year: y,
    monthIdx0: m0,
    valid: false,
  };
}

function shiftMonth(year: number, monthIdx0: number, delta: number): string {
  const d = new Date(year, monthIdx0 + delta, 1, 0, 0, 0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function vnMonthLabel(year: number, monthIdx0: number): string {
  return `Tháng ${pad2(monthIdx0 + 1)}/${year}`;
}

function fmtIsoDmy(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

async function fetchCalendar(
  ym: string,
): Promise<CalendarResponse | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const cookie = h.get("cookie") ?? "";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
  try {
    const res = await fetch(
      `${base}/api/leaves/calendar?month=${encodeURIComponent(ym)}`,
      { cache: "no-store", headers: { cookie } },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      (data as { ok?: unknown }).ok !== true
    ) {
      return null;
    }
    return data as CalendarResponse;
  } catch {
    return null;
  }
}

const TYPE_LABEL: Record<LeaveTypeKey, string> = {
  annual: "Phép năm",
  sick: "Ốm đau",
  personal: "Cá nhân",
  unpaid: "Không lương",
};

const TYPE_CHIP_CLASS: Record<LeaveTypeKey, string> = {
  annual:
    "border-blue-300/60 bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800/60",
  sick: "border-rose-300/60 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/60",
  personal:
    "border-violet-300/60 bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800/60",
  unpaid:
    "border-slate-300/60 bg-slate-200 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700",
};

const TYPE_BAR_CLASS: Record<LeaveTypeKey, string> = {
  annual:
    "bg-blue-500/85 text-white dark:bg-blue-600/85",
  sick: "bg-rose-500/85 text-white dark:bg-rose-600/85",
  personal: "bg-violet-500/85 text-white dark:bg-violet-600/85",
  unpaid: "bg-slate-500/85 text-white dark:bg-slate-600/85",
};

const WEEKDAY_HEADERS: ReadonlyArray<string> = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

function buildLinkHref(ym: string | null): string {
  if (ym === null) return "/leaves-calendar-board";
  return `/leaves-calendar-board?month=${encodeURIComponent(ym)}`;
}

export default async function LeavesCalendarBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");

  const sp = await searchParams;
  const now = new Date();
  const parsed = parseMonth(sp.month, now);

  const data = await fetchCalendar(parsed.ym);

  // Compute current month ym (no query) for nav
  const currentYm = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const prevYm = shiftMonth(parsed.year, parsed.monthIdx0, -1);
  const nextYm = shiftMonth(parsed.year, parsed.monthIdx0, 1);

  // For "current" button, use null query if it's truly current month
  const currentLinkHref =
    currentYm === parsed.ym ? buildLinkHref(null) : buildLinkHref(null);

  return (
    <div className="space-y-6">
      {/* Header — indigo→purple gradient */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="w-fit gap-1 border-white/30 bg-white/10 text-white"
            >
              <CalendarDays className="size-3" /> Quản trị · Nghỉ phép
            </Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Lịch nghỉ phép
            </h1>
            <p className="text-sm text-white/85">
              {vnMonthLabel(parsed.year, parsed.monthIdx0)} · Trực quan toàn bộ
              đơn nghỉ đã duyệt, ngày lễ và cảnh báo che phủ ca.
            </p>
            {data ? (
              <p className="text-xs text-white/70">
                Cập nhật <TimeAgo iso={data.generatedAt} withPrefix />
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Month navigation */}
      <nav
        aria-label="Điều hướng tháng"
        className="flex flex-wrap items-center gap-2"
      >
        <Button asChild variant="outline" size="sm">
          <Link href={buildLinkHref(prevYm)}>
            <ChevronLeft className="size-4" /> Tháng trước
          </Link>
        </Button>
        <Button
          asChild
          variant={currentYm === parsed.ym ? "default" : "outline"}
          size="sm"
        >
          <Link href={currentLinkHref}>Tháng hiện tại</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={buildLinkHref(nextYm)}>
            Tháng sau <ChevronRight className="size-4" />
          </Link>
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          Đang xem:{" "}
          <span className="font-semibold text-foreground">
            {vnMonthLabel(parsed.year, parsed.monthIdx0)}
          </span>
        </span>
      </nav>

      {data === null ? (
        <EmptyState
          icon={<Inbox style={{ width: 40, height: 40 }} />}
          title="Không tải được lịch nghỉ phép"
          description="Hệ thống không thể lấy dữ liệu từ /api/leaves/calendar. Hãy thử lại sau hoặc kiểm tra kết nối."
          action={
            <Button asChild variant="outline">
              <Link href={buildLinkHref(null)}>Về tháng hiện tại</Link>
            </Button>
          }
          variant="card"
          size="lg"
        />
      ) : (
        <LeaveCalendarContent data={data} />
      )}
    </div>
  );
}

function LeaveCalendarContent({ data }: { data: CalendarResponse }) {
  const { summary, days, weeks } = data;
  const totalRequests =
    summary.byType.annual +
    summary.byType.sick +
    summary.byType.personal +
    summary.byType.unpaid;

  const peakLabel =
    summary.peakDay && summary.peakDay.count > 0
      ? `${fmtIsoDmy(summary.peakDay.iso)} (${summary.peakDay.count} người)`
      : "—";

  return (
    <>
      {/* KPI Row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStat
          label="Tổng ngày nghỉ trong tháng"
          value={<LiveCounter to={summary.totalApprovedDays} duration={700} />}
          hint="Tổng số ngày-người đã được duyệt"
          icon={<CalendarDays className="size-5" />}
          variant="accent"
        />
        <KPIStat
          label="Đỉnh điểm"
          value={peakLabel}
          hint={
            summary.peakDay && summary.peakDay.count > 0
              ? "Ngày có nhiều nhân viên nghỉ nhất"
              : "Không có ngày cao điểm"
          }
          icon={<TrendingUp className="size-5" />}
        />
        <KPIStat
          label="Đơn nghỉ phép"
          value={<LiveCounter to={totalRequests} duration={700} />}
          hint="Số đơn chạm vào tháng này"
          icon={<Users className="size-5" />}
        />
        <KPIStat
          label="Cảnh báo che phủ"
          value={
            <LiveCounter to={summary.coverageWarnings.length} duration={700} />
          }
          hint={
            summary.coverageWarnings.length > 0
              ? "Ngày có ≥3 người nghỉ — cần sắp ca thay"
              : "Không có cảnh báo"
          }
          icon={<AlertTriangle className="size-5" />}
          variant={summary.coverageWarnings.length > 0 ? "accent" : "default"}
        />
      </section>

      {/* By-type chips */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Theo loại nghỉ:
        </span>
        {(Object.keys(TYPE_LABEL) as LeaveTypeKey[]).map((k) => (
          <span
            key={k}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              TYPE_CHIP_CLASS[k],
            )}
          >
            <span>{TYPE_LABEL[k]}</span>
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground/80 dark:bg-black/30 dark:text-white/80">
              {summary.byType[k]}
            </span>
          </span>
        ))}
      </section>

      {/* Calendar grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4" /> Lịch tháng ({weeks} tuần)
          </CardTitle>
          <CardDescription>
            Mỗi ô là một ngày. Thanh màu hiển thị đơn nghỉ phép đã duyệt, đầu và
            cuối đơn được bo góc. Ngày lễ VN gắn nhãn đỏ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 pb-2">
            {WEEKDAY_HEADERS.map((w, i) => (
              <div
                key={w}
                className={cn(
                  "text-center text-xs font-semibold uppercase tracking-wide",
                  i >= 5 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
                )}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((cell) => (
              <DayCellView key={cell.iso} cell={cell} />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 rounded ring-2 ring-primary" />
              Hôm nay
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 rounded border-2 border-amber-500" />
              ≥3 người nghỉ
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 rounded bg-muted" />
              Cuối tuần
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              ● Ngày lễ VN
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Coverage warnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" /> Cảnh báo che phủ
            ca
          </CardTitle>
          <CardDescription>
            Những ngày có từ 3 nhân viên nghỉ trở lên — cần cân nhắc bố trí ca
            thay thế.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.coverageWarnings.length === 0 ? (
            <EmptyState
              title="Không có cảnh báo"
              description="Mức độ phủ ca trong tháng này ổn — không có ngày nào ≥3 người nghỉ."
              variant="subtle"
              size="sm"
            />
          ) : (
            <ul className="space-y-2">
              {summary.coverageWarnings.map((msg, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-900 dark:text-amber-100">
                    {msg}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function DayCellView({ cell }: { cell: DayCell }) {
  const visibleLeaves = cell.leaves.slice(0, 3);
  const hiddenCount = cell.leaves.length - visibleLeaves.length;
  const warnBorder = cell.count >= 3;

  return (
    <div
      className={cn(
        "relative flex min-h-[96px] flex-col rounded-lg border bg-card p-1.5 text-xs transition-colors",
        !cell.inTargetMonth && "bg-muted/20 opacity-60",
        cell.isWeekend && "bg-muted/30",
        cell.isToday && "ring-2 ring-primary",
        warnBorder && "border-amber-500 border-2",
      )}
      title={
        cell.holidayName
          ? `${fmtIsoDmy(cell.iso)} — ${cell.holidayName}`
          : fmtIsoDmy(cell.iso)
      }
    >
      {/* Day number + holiday */}
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            !cell.inTargetMonth
              ? "text-muted-foreground/60"
              : cell.isToday
                ? "text-primary"
                : cell.isWeekend
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground",
          )}
        >
          {cell.dayOfMonth}
        </span>
        {cell.count > 0 ? (
          <span className="rounded-full bg-foreground/10 px-1.5 py-0 text-[10px] font-semibold tabular-nums text-foreground/80">
            {cell.count}
          </span>
        ) : null}
      </div>

      {cell.isVietHoliday && cell.holidayName ? (
        <div
          className="mt-0.5 truncate text-[10px] font-semibold text-rose-600 dark:text-rose-400"
          title={cell.holidayName}
        >
          {cell.holidayName}
        </div>
      ) : null}

      {/* Leave bars */}
      <div className="mt-1 flex flex-col gap-0.5">
        {visibleLeaves.map((lv, idx) => (
          <LeaveBar key={`${lv.id}-${idx}`} leave={lv} />
        ))}
        {hiddenCount > 0 ? (
          <div className="px-1 text-[10px] font-medium text-muted-foreground">
            +{hiddenCount} nữa
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LeaveBar({ leave }: { leave: DayLeave }) {
  // Round corners only at start / end
  const roundClass = cn(
    leave.isStart && "rounded-l-md",
    leave.isEnd && "rounded-r-md",
    !leave.isStart && !leave.isEnd && "rounded-none",
    leave.isStart && leave.isEnd && "rounded-md",
  );
  return (
    <div
      className={cn(
        "truncate px-1.5 py-0.5 text-[10px] font-medium leading-tight",
        TYPE_BAR_CLASS[leave.type],
        roundClass,
      )}
      title={`${leave.employeeName} · ${TYPE_LABEL[leave.type]}`}
    >
      {leave.employeeName}
    </div>
  );
}
