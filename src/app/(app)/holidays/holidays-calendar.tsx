"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LayoutGrid, List, Clock, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/lib/holidays";
import { gregorianToLunar, formatLunarShort } from "@/lib/lunar-calendar";

type ViewMode = "grid" | "list";

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

type DayCell =
  | { kind: "blank" }
  | { kind: "day"; day: number; iso: string };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildMonthCells(year: number, month: number): DayCell[] {
  const cells: DayCell[] = [];
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = monthStart.getDay(); // 0=Sun..6=Sat
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
  for (let i = 0; i < leadingBlanks; i++) cells.push({ kind: "blank" });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    cells.push({ kind: "day", day: d, iso });
  }
  while (cells.length % 7 !== 0) cells.push({ kind: "blank" });
  return cells;
}

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map((p) => Number.parseInt(p, 10));
  return new Date(y, m - 1, d);
}

function lunarChipFor(iso: string): string {
  return formatLunarShort(gregorianToLunar(parseIsoLocal(iso)));
}

function formatDmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function typeTintCell(type: Holiday["type"]): string {
  return type === "public"
    ? "bg-rose-500/15 ring-1 ring-rose-500/40 text-rose-700 dark:text-rose-300"
    : "bg-amber-500/15 ring-1 ring-amber-500/40 text-amber-700 dark:text-amber-300";
}

function typeBadgeClasses(type: Holiday["type"]): string {
  return type === "public"
    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30";
}

function typeLabel(type: Holiday["type"]): string {
  return type === "public" ? "Lễ chính thức" : "Ngày kỷ niệm";
}

export function HolidaysCalendar({
  holidays,
  year,
}: {
  holidays: Holiday[];
  year: number;
}) {
  const [view, setView] = useState<ViewMode>("grid");
  // Hydration-safe: compute today on client only.
  const [todayIso, setTodayIso] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setTodayIso(
      `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
    );
  }, []);

  const holidayMap = useMemo(() => {
    const m = new Map<string, Holiday>();
    for (const h of holidays) m.set(h.iso, h);
    return m;
  }, [holidays]);

  const publicCount = useMemo(
    () => holidays.filter((h) => h.type === "public").length,
    [holidays],
  );
  const observedCount = useMemo(
    () => holidays.filter((h) => h.type === "observed").length,
    [holidays],
  );

  const daysUntilNext = useMemo<number | null>(() => {
    if (!todayIso) return null;
    const upcoming = holidays.filter((h) => h.iso >= todayIso);
    if (upcoming.length === 0) return null;
    const next = upcoming[0];
    const today = parseIsoLocal(todayIso);
    const target = parseIsoLocal(next.iso);
    const diff = Math.round(
      (target.getTime() - today.getTime()) / 86_400_000,
    );
    return diff;
  }, [todayIso, holidays]);

  const nextHoliday = useMemo<Holiday | null>(() => {
    if (!todayIso) return null;
    const upcoming = holidays.filter((h) => h.iso >= todayIso);
    return upcoming[0] ?? null;
  }, [todayIso, holidays]);

  const groupedByMonth = useMemo(() => {
    const groups: Array<{ month: number; items: Holiday[] }> = [];
    for (let m = 0; m < 12; m++) groups.push({ month: m, items: [] });
    for (const h of holidays) {
      const monthIdx = Number.parseInt(h.iso.slice(5, 7), 10) - 1;
      const g = groups[monthIdx];
      if (g) g.items.push(h);
    }
    return groups;
  }, [holidays]);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-300">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lễ chính thức</p>
              <p className="text-2xl font-bold tabular-nums leading-tight">
                {publicCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ngày kỷ niệm</p>
              <p className="text-2xl font-bold tabular-nums leading-tight">
                {observedCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Lễ tiếp theo</p>
              {daysUntilNext === null || nextHoliday === null ? (
                <p className="text-sm italic text-muted-foreground">
                  {todayIso === null ? "Đang tính..." : "Không có lễ trong năm"}
                </p>
              ) : (
                <>
                  <p className="text-2xl font-bold tabular-nums leading-tight">
                    {daysUntilNext === 0
                      ? "Hôm nay"
                      : `${daysUntilNext} ngày`}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {nextHoliday.name}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={view === "grid" ? "default" : "outline"}
          onClick={() => setView("grid")}
          aria-pressed={view === "grid"}
        >
          <LayoutGrid className="size-3.5" />
          Lưới
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
        >
          <List className="size-3.5" />
          Danh sách
        </Button>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {VN_MONTHS.map((monthLabel, monthIdx) => {
            const cells = buildMonthCells(year, monthIdx);
            return (
              <Card key={monthIdx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{monthLabel}</CardTitle>
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
                            key={`b${monthIdx}-${i}`}
                            aria-hidden
                            className="aspect-square"
                          />
                        );
                      }
                      const h = holidayMap.get(c.iso) ?? null;
                      const isToday = todayIso !== null && c.iso === todayIso;
                      const lunar = lunarChipFor(c.iso);
                      const title = h
                        ? `${h.name} — ${formatDmy(c.iso)} (${lunar})`
                        : `${formatDmy(c.iso)} (${lunar})`;
                      return (
                        <div
                          key={c.iso}
                          title={title}
                          className={cn(
                            "relative flex aspect-square flex-col items-center justify-center rounded p-0.5 text-[10px]",
                            isToday &&
                              "ring-2 ring-primary ring-offset-1 ring-offset-card",
                            h ? typeTintCell(h.type) : "text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "tabular-nums font-semibold leading-none",
                              h && "font-bold",
                            )}
                          >
                            {c.day}
                          </span>
                          {h && (
                            <span className="mt-0.5 text-[7.5px] font-medium leading-none opacity-80">
                              {lunar}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByMonth.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <Card key={group.month}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{VN_MONTHS[group.month]}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {group.items.length} ngày
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="divide-y divide-border">
                    {group.items.map((h) => {
                      const lunar = lunarChipFor(h.iso);
                      const isToday = todayIso !== null && h.iso === todayIso;
                      return (
                        <li
                          key={h.iso}
                          className={cn(
                            "flex items-center gap-3 px-2 py-3",
                            isToday && "bg-primary/5",
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-12 shrink-0 flex-col items-center justify-center rounded-md font-bold tabular-nums",
                              typeTintCell(h.type),
                            )}
                          >
                            <span className="text-base leading-none">
                              {h.iso.slice(8, 10)}
                            </span>
                            <span className="text-[9px] font-medium leading-none opacity-70">
                              {h.iso.slice(5, 7)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{h.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDmy(h.iso)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                                typeBadgeClasses(h.type),
                              )}
                            >
                              {typeLabel(h.type)}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground tabular-nums">
                              {lunar}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
          {holidays.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Không có ngày lễ nào trong năm {year}.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
