import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getHolidaysInRange } from "@/lib/holidays";
import { ShiftForm } from "./shift-form";
import { WeekGrid } from "./week-grid";
import { WeekNav } from "./week-nav";
import Link from "next/link";
import { Calendar, CalendarDays, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DuplicateWeekButton } from "./duplicate-week-button";
import { SmartSuggestButton } from "./smart-suggest-button";
import { ShiftImportButton } from "./import-dialog";
import { SwapShiftsDialog } from "./swap-shifts-dialog";
import { TemplateManagerDialog } from "./template-manager-dialog";
import { getSession } from "@/lib/auth";
import { detectCoverageGaps } from "@/lib/coverage-gaps";
import { CoverageGapsBanner } from "@/components/coverage-gaps-banner";
import { CoverageStatsCard } from "@/components/coverage-stats-card";
import { computeCoverageStats } from "@/lib/coverage-stats";
import { CoverRequestsBanner } from "@/components/cover-requests-banner";
import { getOpenCoverRequests, type OpenCoverRequest } from "@/lib/cover-requests";
import { SwapSuggestionsCard } from "@/components/swap-suggestions-card";
import type { ReactNode } from "react";
import { findShiftOverlaps, type ShiftLite } from "@/lib/shift-overlap";
import { ShiftOverlapChip } from "@/components/shift-overlap-chip";

export const dynamic = "force-dynamic";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-first
  d.setDate(d.getDate() + diff);
  return d;
}

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const filterDate = sp.date ?? today;
  const weekStart = startOfWeek(new Date(filterDate));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const weekHolidays = getHolidaysInRange(weekStart, weekEnd);
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  let employees: { id: number; name: string; role: string }[] = [];
  let shifts: Awaited<ReturnType<typeof prisma.shift.findMany>> = [];
  let error: string | null = null;

  try {
    [employees, shifts] = await Promise.all([
      prisma.employee.findMany({
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.shift.findMany({
        where: { shiftDate: { gte: weekStart, lt: weekEnd } },
        orderBy: [{ shiftDate: "asc" }, { shiftType: "asc" }, { startTime: "asc" }],
      }),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  let openCoverRequests: OpenCoverRequest[] = [];
  try {
    openCoverRequests = await getOpenCoverRequests();
  } catch {
    openCoverRequests = [];
  }

  let viewerEmployeeId: number | null = null;
  if (session?.email) {
    try {
      const me = await prisma.employee.findFirst({
        where: { email: session.email },
        select: { id: true },
      });
      viewerEmployeeId = me?.id ?? null;
    } catch {
      viewerEmployeeId = null;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lập lịch ca</CardTitle>
          <CardDescription>Chọn nhân viên, ngày và loại ca (sáng/chiều/tối)</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có nhân viên nào — vào trang Nhân viên để thêm trước.
            </p>
          ) : (
            <ShiftForm employees={employees} defaultDate={filterDate} />
          )}
        </CardContent>
      </Card>

      {isAdmin && !error && (
        <CoverageGapsBanner
          gaps={detectCoverageGaps(shifts, weekStart)}
          weekStartIso={weekStartIso}
        />
      )}

      <CoverRequestsBanner
        items={openCoverRequests}
        currentEmployeeId={viewerEmployeeId}
        suggestionsByShiftId={openCoverRequests.reduce<Record<number, ReactNode>>(
          (acc, it) => {
            acc[it.shiftId] = (
              <SwapSuggestionsCard key={it.shiftId} shiftId={it.shiftId} />
            );
            return acc;
          },
          {},
        )}
      />

      {isAdmin && !error && shifts.length > 0 && (
        <CoverageStatsCard stats={computeCoverageStats(shifts, weekStart)} />
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>
              Tuần {formatDate(weekStart)} – {formatDate(new Date(weekEnd.getTime() - 86400000))}
            </CardTitle>
            <CardDescription>
              {shifts.length} ca trong tuần · click nhân viên để xoá
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && !error && (
              <ShiftOverlapChip
                overlaps={findShiftOverlaps(
                  shifts.map<ShiftLite>((s) => {
                    const emp = employees.find((e) => e.id === s.employeeId);
                    return {
                      id: s.id,
                      employeeId: s.employeeId,
                      employeeName: emp?.name ?? `#${s.employeeId}`,
                      shiftDate: s.shiftDate,
                      startTime: s.startTime,
                      endTime: s.endTime,
                    };
                  }),
                )}
              />
            )}
            <SmartSuggestButton weekStart={weekStartIso} />
            <ShiftImportButton />
            <Button asChild variant="outline" size="sm">
              <Link href="/api/shifts/calendar.ics" prefetch={false}>
                <Calendar className="size-4" />
                .ics
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/shifts/print?week=${weekStartIso}`}
                target="_blank"
                prefetch={false}
              >
                <Printer className="size-4" />
                In tuần
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/shifts/month?period=${weekStartIso.slice(0, 7)}`}
                prefetch={false}
              >
                <CalendarDays className="size-4" />
                Lịch tháng
              </Link>
            </Button>
            {isAdmin && (
              <TemplateManagerDialog
                shifts={shifts.map((s) => ({
                  id: s.id,
                  employeeId: s.employeeId,
                  shiftDate: s.shiftDate,
                  shiftType: s.shiftType as
                    | "morning"
                    | "afternoon"
                    | "evening"
                    | null,
                  startTime: s.startTime,
                  endTime: s.endTime,
                }))}
                employees={employees}
                weekStartIso={weekStartIso}
                isAdmin={isAdmin}
              />
            )}
            {shifts.length > 0 && <DuplicateWeekButton weekStart={weekStartIso} />}
            {shifts.length > 0 && isAdmin && (
              <SwapShiftsDialog
                employees={employees}
                shifts={shifts.map((s) => ({
                  id: s.id,
                  employeeId: s.employeeId,
                  shiftDate: s.shiftDate,
                  shiftType: s.shiftType as
                    | "morning"
                    | "afternoon"
                    | "evening"
                    | null,
                  startTime: s.startTime,
                  endTime: s.endTime,
                }))}
                weekStartIso={weekStartIso}
                isAdmin={isAdmin}
              />
            )}
            <WeekNav weekStart={weekStartIso} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {weekHolidays.length > 0 && (
            <div
              className="rounded-md border border-rose-200/70 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
              role="status"
            >
              <span className="font-medium">🇻🇳 Có ngày nghỉ trong tuần này:</span>{" "}
              {weekHolidays.map((h, i) => (
                <span key={h.iso}>
                  {i > 0 ? ", " : ""}
                  {h.iso.slice(8)}/{h.iso.slice(5, 7)} {h.name}
                </span>
              ))}
            </div>
          )}
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : shifts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="relative size-40 overflow-hidden rounded-lg opacity-90">
                <Image
                  src="/assets/empty-shifts.jpg"
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Tuần này chưa có ca nào — thêm bằng form ở trên.
              </p>
            </div>
          ) : (
            <WeekGrid
              weekStart={weekStart}
              shifts={shifts.map((s) => ({
                id: s.id,
                employeeId: s.employeeId,
                shiftDate: s.shiftDate,
                shiftType: s.shiftType as "morning" | "afternoon" | "evening" | null,
                startTime: s.startTime,
                endTime: s.endTime,
              }))}
              employees={employees}
              holidays={weekHolidays}
              isAdmin={isAdmin}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
