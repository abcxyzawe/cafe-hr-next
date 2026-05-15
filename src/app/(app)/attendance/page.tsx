import Image from "next/image";
import Link from "next/link";
import { Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";
import { CheckInButton, CheckOutButton } from "./attendance-buttons";
import {
  AttendanceHistoryTable,
  type AttendanceHistoryRow,
} from "./attendance-history-table";
import { LateArrivalCard } from "@/components/late-arrival-card";
import { getLateArrivalStats, type LateStats } from "@/lib/late-arrivals";
import { HolidayWarningBanner } from "@/components/holiday-warning-banner";
import { getUpcomingHolidays } from "@/lib/upcoming-holidays";

export const dynamic = "force-dynamic";

function currentWeekStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default async function AttendancePage() {
  const sess = await getSession();
  const isAdmin = sess?.role === "admin";
  const weekIso = currentWeekStartIso();

  let employees: Awaited<ReturnType<typeof prisma.employee.findMany>> = [];
  let recent: Awaited<ReturnType<typeof prisma.attendance.findMany>> = [];
  let openMap = new Map<number, boolean>();
  let error: string | null = null;

  try {
    [employees, recent] = await Promise.all([
      prisma.employee.findMany({ orderBy: { name: "asc" } }),
      prisma.attendance.findMany({
        take: 30,
        orderBy: { checkIn: "desc" },
        include: { employee: { select: { name: true, role: true } } },
      }),
    ]);
    const openList = await prisma.attendance.findMany({
      where: { checkOut: null },
      select: { employeeId: true },
    });
    openMap = new Map(openList.map((a) => [a.employeeId, true]));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  let lateStats: LateStats | null = null;
  if (isAdmin) {
    try {
      lateStats = await getLateArrivalStats();
    } catch {
      lateStats = null;
    }
  }

  const upcomingHolidays = getUpcomingHolidays(3);

  return (
    <div className="space-y-6">
      <HolidayWarningBanner upcoming={upcomingHolidays} />
      {isAdmin && <LateArrivalCard stats={lateStats} />}
      <Card>
        <CardHeader>
          <CardTitle>Chấm công nhanh</CardTitle>
          <CardDescription>Bấm check-in / check-out cho từng nhân viên</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="relative size-40 overflow-hidden rounded-2xl shadow-sm">
                <Image
                  src="/assets/welcome-first-employee.jpg"
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-medium">Chưa có nhân viên nào</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vào trang Nhân viên để thêm trước khi chấm công.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {employees.map((e) => {
                const onShift = openMap.has(e.id);
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
                  >
                    <Avatar src={e.avatarUrl} alt={e.name} fallback={e.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[e.role] ?? e.role}
                        {onShift && (
                          <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            đang làm
                          </span>
                        )}
                      </p>
                    </div>
                    {onShift ? <CheckOutButton id={e.id} /> : <CheckInButton id={e.id} />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Lịch sử chấm công</CardTitle>
            <CardDescription>30 lượt gần nhất</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/attendance/print?week=${weekIso}`}
                  target="_blank"
                  prefetch={false}
                >
                  <Printer className="size-4" />
                  In tuần
                </Link>
              </Button>
            )}
            <a
              href="/api/attendance/csv"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
            >
              Xuất CSV
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu chấm công</p>
          ) : (
            <AttendanceHistoryTable
              isAdmin={isAdmin}
              rows={recent.map<AttendanceHistoryRow>((a) => ({
                id: a.id,
                employeeName: (a as unknown as { employee: { name: string } })
                  .employee.name,
                checkIn: a.checkIn,
                checkOut: a.checkOut,
                hoursWorked: a.hoursWorked !== null ? Number(a.hoursWorked) : null,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
