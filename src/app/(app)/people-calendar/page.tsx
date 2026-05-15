import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Cake,
  Award,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isHoliday, getHoliday } from "@/lib/holidays";
import { ROLE_LABELS, cn, formatDate } from "@/lib/utils";
import {
  ROLE_KEYS,
  getRoleVisual,
  parseRolesParam,
  type RoleKey,
} from "@/lib/role-colors";
import {
  RoleFilterChips,
  type RoleChip,
} from "./role-filter-chips";

export const dynamic = "force-dynamic";

const VN_MONTHS = [
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
const VN_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type EmployeeBasic = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  dateOfBirth: Date | null;
  createdAt: Date;
};

function parseYear(value: string | undefined): number {
  if (!value) return new Date().getFullYear();
  const n = Number(value);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return new Date().getFullYear();
  return n;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthCells(
  year: number,
  month: number,
): Array<{ kind: "blank" } | { kind: "day"; day: number; date: Date; iso: string }> {
  const cells: ReturnType<typeof buildMonthCells> = [];
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = monthStart.getDay(); // 0=Sun..6=Sat
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  for (let i = 0; i < leadingBlanks; i++) cells.push({ kind: "blank" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ kind: "day", day: d, date, iso: ymd(date) });
  }
  while (cells.length % 7 !== 0) cells.push({ kind: "blank" });
  return cells;
}

export default async function PeopleCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; roles?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const sp = await searchParams;
  const year = parseYear(sp.year);
  const todayIso = ymd(new Date());

  const employeesAll = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
      dateOfBirth: true,
      createdAt: true,
    },
  });

  // Build chip counts BEFORE filter so user always sees what's available
  const roleCounts: Record<RoleKey, number> = {
    barista: 0,
    server: 0,
    cashier: 0,
    manager: 0,
  };
  for (const e of employeesAll) {
    const rk = e.role as RoleKey;
    if (rk in roleCounts) roleCounts[rk] += 1;
  }
  const roleChips: RoleChip[] = ROLE_KEYS.map((k) => ({
    key: k,
    label: ROLE_LABELS[k] ?? k,
    count: roleCounts[k],
  }));

  const selectedRoles = parseRolesParam(sp.roles);
  const selectedSet = new Set<string>(selectedRoles);
  const employees =
    selectedSet.size === 0
      ? employeesAll
      : employeesAll.filter((e) => selectedSet.has(e.role));

  // Build per-MM-DD maps
  const birthdayMap = new Map<string, EmployeeBasic[]>();
  const anniversaryMap = new Map<string, EmployeeBasic[]>();
  for (const e of employees) {
    if (e.dateOfBirth) {
      const dob = new Date(e.dateOfBirth);
      const key = `${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
      const list = birthdayMap.get(key) ?? [];
      list.push(e);
      birthdayMap.set(key, list);
    }
    const joined = new Date(e.createdAt);
    if (joined.getFullYear() < year) {
      const key = `${String(joined.getMonth() + 1).padStart(2, "0")}-${String(joined.getDate()).padStart(2, "0")}`;
      const list = anniversaryMap.get(key) ?? [];
      list.push(e);
      anniversaryMap.set(key, list);
    }
  }

  const totalBirthdays = Array.from(birthdayMap.values()).reduce(
    (a, b) => a + b.length,
    0,
  );
  const totalAnniversaries = Array.from(anniversaryMap.values()).reduce(
    (a, b) => a + b.length,
    0,
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-accent/30 to-background">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              Lịch sự kiện đội ngũ — Năm {year}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <Cake className="size-3.5 text-rose-500" />
                {totalBirthdays} sinh nhật
              </span>
              <span className="inline-flex items-center gap-1">
                <Award className="size-3.5 text-amber-500" />
                {totalAnniversaries} kỷ niệm làm việc
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5 text-muted-foreground" />
                {employees.length} nhân viên
              </span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button asChild variant="secondary" size="sm">
              <Link href="/birthdays">
                <Cake className="size-3.5" />
                Xem tất cả sinh nhật
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  selectedRoles.length > 0
                    ? `/people-calendar?year=${year - 1}&roles=${selectedRoles.join(",")}`
                    : `/people-calendar?year=${year - 1}`
                }
              >
                <ChevronLeft className="size-4" />
                {year - 1}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={year >= 2100}>
              <Link
                href={
                  selectedRoles.length > 0
                    ? `/people-calendar?year=${year + 1}&roles=${selectedRoles.join(",")}`
                    : `/people-calendar?year=${year + 1}`
                }
              >
                {year + 1}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <RoleFilterChips roles={roleChips} selected={selectedRoles} />
      {selectedRoles.length > 0 && employees.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Không có nhân viên nào khớp bộ lọc vai trò hiện tại.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {VN_MONTHS.map((monthLabel, monthIdx) => {
          const cells = buildMonthCells(year, monthIdx);
          return (
            <Card key={monthIdx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{monthLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {VN_WEEKDAYS.map((w, i) => (
                    <span key={w} className={cn(i >= 5 && "text-rose-500/70")}>
                      {w}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((c, i) => {
                    if (c.kind === "blank") {
                      return (
                        <span
                          key={`b${i}`}
                          aria-hidden
                          className="aspect-square"
                        />
                      );
                    }
                    const md = c.iso.slice(5);
                    const bds = birthdayMap.get(md) ?? [];
                    const anns = anniversaryMap.get(md) ?? [];
                    const isToday = c.iso === todayIso;
                    const holidayInfo = isHoliday(c.date) ? getHoliday(c.date) : null;
                    const hasEvent = bds.length > 0 || anns.length > 0;
                    const tooltipParts: string[] = [];
                    if (bds.length > 0)
                      tooltipParts.push(
                        `🎂 ${bds.map((e) => e.name).join(", ")}`,
                      );
                    if (anns.length > 0) {
                      const annLabels = anns.map((e) => {
                        const yrs = year - new Date(e.createdAt).getFullYear();
                        return `${e.name} (${yrs}y)`;
                      });
                      tooltipParts.push(`🏆 ${annLabels.join(", ")}`);
                    }
                    if (holidayInfo) tooltipParts.push(`🎉 ${holidayInfo.name}`);
                    const tooltip = tooltipParts.join(" · ") || c.iso;

                    // Role-coloured dots: one tiny dot per (event × person) up to a cap,
                    // tinted by the employee's role palette.
                    type EventDot = { key: string; role: string; kind: "b" | "a" };
                    const dots: EventDot[] = [];
                    for (const e of bds)
                      dots.push({ key: `b-${e.id}`, role: e.role, kind: "b" });
                    for (const e of anns)
                      dots.push({ key: `a-${e.id}`, role: e.role, kind: "a" });
                    const visibleDots = dots.slice(0, 4);
                    const overflow = dots.length - visibleDots.length;
                    // If every event on this day shares one role, accent the cell border-left.
                    const eventRoles = new Set(dots.map((d) => d.role));
                    const singleRoleAccent =
                      eventRoles.size === 1
                        ? getRoleVisual(dots[0]!.role)
                        : null;

                    return (
                      <div
                        key={c.iso}
                        title={tooltip}
                        className={cn(
                          "relative flex aspect-square flex-col items-center justify-start rounded p-0.5 text-[10px]",
                          isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                          hasEvent && !isToday && "bg-muted/30",
                          singleRoleAccent && !isToday && !holidayInfo &&
                            cn("border-l-2", singleRoleAccent.border, singleRoleAccent.tint),
                          holidayInfo && "bg-rose-500/10",
                        )}
                      >
                        <span
                          className={cn(
                            "tabular-nums font-medium leading-none",
                            holidayInfo && "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {c.day}
                        </span>
                        <div className="mt-auto flex flex-wrap items-center justify-center gap-0.5">
                          {visibleDots.map((d) => {
                            const v = getRoleVisual(d.role);
                            return (
                              <span
                                key={d.key}
                                aria-hidden
                                className={cn(
                                  "inline-block size-1.5 rounded-full ring-1 ring-card",
                                  v ? v.dot : d.kind === "b" ? "bg-rose-500" : "bg-amber-500",
                                )}
                              />
                            );
                          })}
                          {overflow > 0 && (
                            <span className="text-[8px] font-semibold leading-none text-muted-foreground">
                              +{overflow}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend + recent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sự kiện sắp tới</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500" />
              Sinh nhật
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" />
              Kỷ niệm
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500/40" />
              Ngày lễ VN
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full ring-2 ring-primary" />
              Hôm nay
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpcomingList
            employees={employees}
            year={year}
            kind="birthday"
          />
          <UpcomingList
            employees={employees}
            year={year}
            kind="anniversary"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function UpcomingList({
  employees,
  year,
  kind,
}: {
  employees: EmployeeBasic[];
  year: number;
  kind: "birthday" | "anniversary";
}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 90);

  type Item = {
    id: number;
    name: string;
    avatarUrl: string | null;
    role: string;
    date: Date;
    daysUntil: number;
    label: string;
  };

  const items: Item[] = [];
  for (const e of employees) {
    if (kind === "birthday") {
      if (!e.dateOfBirth) continue;
      const dob = new Date(e.dateOfBirth);
      let next = new Date(year, dob.getMonth(), dob.getDate());
      if (next < today) next = new Date(year + 1, dob.getMonth(), dob.getDate());
      if (next > horizon) continue;
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000);
      const turning = next.getFullYear() - dob.getFullYear();
      items.push({
        id: e.id,
        name: e.name,
        avatarUrl: e.avatarUrl,
        role: e.role,
        date: next,
        daysUntil,
        label: `Tròn ${turning} tuổi`,
      });
    } else {
      const joined = new Date(e.createdAt);
      if (joined.getFullYear() >= year) continue;
      let next = new Date(year, joined.getMonth(), joined.getDate());
      if (next < today)
        next = new Date(year + 1, joined.getMonth(), joined.getDate());
      if (next > horizon) continue;
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000);
      const yearsCount = next.getFullYear() - joined.getFullYear();
      items.push({
        id: e.id,
        name: e.name,
        avatarUrl: e.avatarUrl,
        role: e.role,
        date: next,
        daysUntil,
        label: `Tròn ${yearsCount} năm`,
      });
    }
  }
  items.sort((a, b) => a.daysUntil - b.daysUntil);

  if (items.length === 0) {
    return (
      <p className="py-2 text-xs italic text-muted-foreground">
        Không có {kind === "birthday" ? "sinh nhật" : "kỷ niệm"} nào trong 90 ngày tới.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {kind === "birthday" ? "🎂 Sinh nhật 90 ngày tới" : "🏆 Kỷ niệm 90 ngày tới"}
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.slice(0, 8).map((it) => {
          const v = getRoleVisual(it.role);
          return (
          <li key={`${kind}-${it.id}`}>
            <Link
              href={`/employees/${it.id}`}
              data-employee-id={it.id}
              className={cn(
                "flex items-center gap-2 rounded-md border border-l-4 bg-card px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                v ? v.border : "border-l-muted-foreground/30",
              )}
            >
              <Avatar src={it.avatarUrl} fallback={it.name} role={it.role} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.name}</p>
                <p className={cn("text-[10px]", v ? v.text : "text-muted-foreground")}>
                  {ROLE_LABELS[it.role] ?? it.role} · {it.label}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums whitespace-nowrap",
                  it.daysUntil === 0
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : it.daysUntil <= 7
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {it.daysUntil === 0
                  ? "Hôm nay"
                  : it.daysUntil === 1
                    ? "Mai"
                    : `${it.daysUntil}d`}
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
