import Link from "next/link";
import { redirect } from "next/navigation";
import { Cake, ChevronRight, Filter, Users, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth";
import { upcomingBirthdays, type UpcomingBirthday } from "@/lib/birthday";
import { ROLE_LABELS, cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VALID_WINDOWS: ReadonlyArray<number> = [30, 60, 90, 365];
const ROLE_KEYS: ReadonlyArray<string> = ["barista", "server", "cashier", "manager"];

function parseWindow(value: string | undefined): number {
  if (!value) return 60;
  const n = Number(value);
  if (!Number.isInteger(n)) return 60;
  if (n < 1 || n > 365) return 60;
  return n;
}

function parseRole(value: string | undefined): string | null {
  if (!value) return null;
  return ROLE_KEYS.includes(value) ? value : null;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return `Tháng ${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function dayMonth(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function countdownLabel(days: number): string {
  if (days === 0) return "Hôm nay!";
  if (days === 1) return "Ngày mai";
  return `${days} ngày nữa`;
}

function countdownClasses(days: number): string {
  if (days === 0)
    return "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/50";
  if (days <= 7)
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30";
  if (days <= 30)
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30";
  return "bg-muted text-muted-foreground ring-1 ring-border";
}

type MonthGroup = {
  key: string;
  label: string;
  items: UpcomingBirthday[];
};

function groupByMonth(items: UpcomingBirthday[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const it of items) {
    const k = monthKey(it.upcomingDate);
    const existing = map.get(k);
    if (existing) {
      existing.items.push(it);
    } else {
      map.set(k, {
        key: k,
        label: monthLabel(it.upcomingDate),
        items: [it],
      });
    }
  }
  // Map iteration is insertion order; items are already sorted by daysUntil
  return Array.from(map.values());
}

export default async function BirthdaysPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; role?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const windowDays = parseWindow(sp.window);
  const roleFilter = parseRole(sp.role);

  const all = await upcomingBirthdays(windowDays);
  const items = roleFilter ? all.filter((b) => b.role === roleFilter) : all;
  const groups = groupByMonth(items);

  const isAdmin = sess.role === "admin";
  const todayCount = items.filter((b) => b.daysUntil === 0).length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-background">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Cake className="size-5 text-rose-500" />
              Sinh nhật sắp tới
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5 text-muted-foreground" />
                {items.length} nhân viên trong {windowDays} ngày tới
              </span>
              {todayCount > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Sparkles className="size-3.5" />
                  {todayCount} hôm nay
                </span>
              )}
              {roleFilter && (
                <span className="inline-flex items-center gap-1">
                  <Filter className="size-3.5 text-muted-foreground" />
                  Lọc theo: {ROLE_LABELS[roleFilter] ?? roleFilter}
                </span>
              )}
            </CardDescription>
          </div>

          <form
            method="GET"
            className="flex flex-wrap items-end gap-2"
            aria-label="Bộ lọc sinh nhật"
          >
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">Khoảng thời gian</span>
              <Select
                name="window"
                defaultValue={String(windowDays)}
                className="h-9 w-32"
              >
                {VALID_WINDOWS.map((w) => (
                  <option key={w} value={w}>
                    {w === 365 ? "1 năm tới" : `${w} ngày tới`}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">Vai trò</span>
              <Select
                name="role"
                defaultValue={roleFilter ?? ""}
                className="h-9 w-36"
              >
                <option value="">Tất cả vai trò</option>
                {ROLE_KEYS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] ?? r}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" size="sm" variant="default">
              Áp dụng
            </Button>
            {(windowDays !== 60 || roleFilter) && (
              <Button asChild type="button" size="sm" variant="ghost">
                <Link href="/birthdays">Đặt lại</Link>
              </Button>
            )}
          </form>
        </CardHeader>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Cake}
              title="Không có sinh nhật sắp tới"
              description={
                roleFilter
                  ? `Không có nhân viên ${ROLE_LABELS[roleFilter] ?? roleFilter} có sinh nhật trong ${windowDays} ngày tới.`
                  : `Không có nhân viên nào có sinh nhật trong ${windowDays} ngày tới. Hãy thử mở rộng khoảng thời gian.`
              }
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/employees">Xem danh sách nhân viên</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{group.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {group.items.length} sinh nhật
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {group.items.map((item) => {
                    const isToday = item.daysUntil === 0;
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/employees/${item.id}`}
                          className={cn(
                            "group flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/50",
                            isToday && "bg-primary/5 hover:bg-primary/10",
                          )}
                        >
                          <Avatar
                            src={item.avatarUrl}
                            fallback={item.name}
                            role={item.role}
                            size={44}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 truncate font-medium">
                              {isToday && (
                                <span aria-hidden className="text-base">🎂</span>
                              )}
                              <span className="truncate">{item.name}</span>
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                {ROLE_LABELS[item.role] ?? item.role}
                              </Badge>
                              <span className="inline-flex items-center gap-1">
                                <Cake className="size-3 text-rose-500/70" />
                                {dayMonth(item.upcomingDate)}
                                <span className="text-muted-foreground/60">
                                  (
                                  {formatDate(item.dateOfBirth)}
                                  )
                                </span>
                              </span>
                              <span>Tròn {item.turningAge} tuổi</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap",
                                countdownClasses(item.daysUntil),
                              )}
                            >
                              {countdownLabel(item.daysUntil)}
                            </span>
                            {isAdmin && (
                              <span
                                className="text-[10px] text-primary opacity-70 transition-opacity group-hover:opacity-100"
                                aria-label="Tạo thiệp sinh nhật"
                              >
                                Tạo thiệp →
                              </span>
                            )}
                          </div>
                          <ChevronRight
                            aria-hidden
                            className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
