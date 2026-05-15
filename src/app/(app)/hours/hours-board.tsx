"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { Copy, Printer, RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HOURS,
  HOURS_EVENT,
  STORAGE_KEY,
  WEEKDAYS,
  WEEKDAY_LABEL,
  getWeekHours,
  resetToDefaults,
  setAllDays,
  setDayHours,
  type DayHours,
  type WeekDay,
  type WeekHours,
} from "@/lib/hours-state";

type Preset = { label: string; open: string; close: string };

const PRESETS: Preset[] = [
  { label: "6:00 – 22:00", open: "06:00", close: "22:00" },
  { label: "7:00 – 21:00", open: "07:00", close: "21:00" },
  { label: "8:00 – 20:00", open: "08:00", close: "20:00" },
];

function formatRange(d: DayHours): string {
  if (d.closed) return "Đóng cửa";
  return `${d.open} – ${d.close}`;
}

export function HoursBoard() {
  const [hours, setHours] = useState<WeekHours>(DEFAULT_HOURS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHours(getWeekHours());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setHours(getWeekHours());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || !detail.key || detail.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(HOURS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(HOURS_EVENT, onCustom);
    };
  }, [hydrated]);

  const handleReset = useCallback(() => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Đặt lại toàn bộ giờ hoạt động về mặc định (07:00 – 22:00 mỗi ngày)?",
    );
    if (!ok) return;
    resetToDefaults();
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;
    window.print();
  }, []);

  const handleChangeDay = useCallback((day: WeekDay, next: DayHours) => {
    setDayHours(day, next);
  }, []);

  const handleApplyAll = useCallback((source: DayHours) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Áp dụng lịch giờ này cho cả 7 ngày trong tuần?",
    );
    if (!ok) return;
    setAllDays(source);
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WEEKDAYS.map((d) => (
            <Skeleton key={d} className="h-64 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const closedCount = WEEKDAYS.filter((d) => hours[d].closed).length;
  const openCount = 7 - closedCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm print:hidden">
        <div className="text-xs text-muted-foreground">
          {closedCount === 0 ? (
            <span>Quán mở cửa cả 7 ngày trong tuần.</span>
          ) : (
            <span>
              Mở cửa <strong className="text-foreground">{openCount}</strong>{" "}
              ngày, đóng cửa{" "}
              <strong className="text-foreground">{closedCount}</strong> ngày.
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            In bảng giờ
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="size-4" />
            Đặt lại mặc định
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {WEEKDAYS.map((day) => (
          <DayCard
            key={day}
            day={day}
            value={hours[day]}
            onChange={handleChangeDay}
            onApplyAll={handleApplyAll}
          />
        ))}
      </div>

      <SummaryTable hours={hours} />
    </div>
  );
}

type DayCardProps = {
  day: WeekDay;
  value: DayHours;
  onChange: (day: WeekDay, next: DayHours) => void;
  onApplyAll: (source: DayHours) => void;
};

function DayCard({ day, value, onChange, onApplyAll }: DayCardProps) {
  const handleToggleClosed = () => {
    onChange(day, { ...value, closed: !value.closed });
  };

  const handleOpenChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(day, { ...value, open: e.target.value });
  };

  const handleCloseChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(day, { ...value, close: e.target.value });
  };

  const handlePreset = (p: Preset) => {
    onChange(day, { open: p.open, close: p.close, closed: false });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{WEEKDAY_LABEL[day]}</CardTitle>
          <button
            type="button"
            role="switch"
            aria-checked={value.closed}
            onClick={handleToggleClosed}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              value.closed
                ? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200"
                : "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "inline-block size-2 rounded-full",
                value.closed ? "bg-rose-500" : "bg-emerald-500",
              )}
            />
            {value.closed ? "Đóng cửa" : "Mở cửa"}
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {value.closed ? (
          <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            Ngày này quán nghỉ. Bật lại nút trên để đặt giờ mở cửa.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Mở cửa
                <Input
                  type="time"
                  value={value.open}
                  onChange={handleOpenChange}
                  className="h-9 text-sm tabular-nums"
                  step={300}
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Đóng cửa
                <Input
                  type="time"
                  value={value.close}
                  onChange={handleCloseChange}
                  className="h-9 text-sm tabular-nums"
                  step={300}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                    value.open === p.open && value.close === p.close
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-auto"
          onClick={() => onApplyAll(value)}
        >
          <Copy className="size-4" />
          Áp dụng cho tất cả ngày khác
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryTable({ hours }: { hours: WeekHours }) {
  return (
    <Card className="print:border-0 print:shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Tổng kết lịch tuần</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Ngày</th>
                <th className="px-3 py-2 font-medium">Giờ hoạt động</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((day) => {
                const v = hours[day];
                return (
                  <tr key={day} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {WEEKDAY_LABEL[day]}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatRange(v)}
                    </td>
                    <td className="px-3 py-2">
                      {v.closed ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
                          Nghỉ
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                          Mở cửa
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
