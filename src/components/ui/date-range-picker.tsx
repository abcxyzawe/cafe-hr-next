"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_30"
  | "custom";

export interface DateRangeValue {
  from: string | null;
  to: string | null;
  preset: string | null;
}

export interface DateRangePickerProps {
  from: string | null;
  to: string | null;
  onChange: (next: DateRangeValue) => void;
  min?: string;
  max?: string;
  compact?: boolean;
  className?: string;
}

interface PresetDef {
  key: Exclude<DateRangePreset, "custom">;
  label: string;
  range: () => { from: string; to: string };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(d: Date): Date {
  const next = new Date(d);
  const day = next.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

const PRESETS: readonly PresetDef[] = [
  {
    key: "today",
    label: "Hôm nay",
    range: () => {
      const t = startOfToday();
      return { from: toISO(t), to: toISO(t) };
    },
  },
  {
    key: "yesterday",
    label: "Hôm qua",
    range: () => {
      const y = addDays(startOfToday(), -1);
      return { from: toISO(y), to: toISO(y) };
    },
  },
  {
    key: "this_week",
    label: "Tuần này",
    range: () => {
      const t = startOfToday();
      return { from: toISO(startOfWeekMonday(t)), to: toISO(t) };
    },
  },
  {
    key: "this_month",
    label: "Tháng này",
    range: () => {
      const t = startOfToday();
      return { from: toISO(startOfMonth(t)), to: toISO(t) };
    },
  },
  {
    key: "last_month",
    label: "Tháng trước",
    range: () => {
      const t = startOfToday();
      const prev = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      return { from: toISO(startOfMonth(prev)), to: toISO(endOfMonth(prev)) };
    },
  },
  {
    key: "last_30",
    label: "30 ngày qua",
    range: () => {
      const t = startOfToday();
      return { from: toISO(addDays(t, -29)), to: toISO(t) };
    },
  },
] as const;

function detectPreset(
  from: string | null,
  to: string | null,
): DateRangePreset {
  if (!from || !to) return "custom";
  for (const p of PRESETS) {
    const r = p.range();
    if (r.from === from && r.to === to) return p.key;
  }
  return "custom";
}

function swapIfNeeded(
  from: string | null,
  to: string | null,
): { from: string | null; to: string | null } {
  if (from && to && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

export function DateRangePicker({
  from,
  to,
  onChange,
  min,
  max,
  compact = false,
  className,
}: DateRangePickerProps): React.JSX.Element {
  const activePreset = React.useMemo(
    () => detectPreset(from, to),
    [from, to],
  );

  const handlePreset = (p: PresetDef): void => {
    const r = p.range();
    onChange({ from: r.from, to: r.to, preset: p.key });
  };

  const handleFromChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const next = swapIfNeeded(e.target.value || null, to);
    onChange({ from: next.from, to: next.to, preset: "custom" });
  };

  const handleToChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const next = swapIfNeeded(from, e.target.value || null);
    onChange({ from: next.from, to: next.to, preset: "custom" });
  };

  const handleClear = (): void => {
    onChange({ from: null, to: null, preset: null });
  };

  const hasValue = from !== null || to !== null;

  const inputHeight = compact ? "h-8 text-xs" : "h-9 text-sm";
  const chipBase = compact
    ? "h-7 px-2.5 text-xs"
    : "h-8 px-3 text-xs";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-input bg-card p-3",
        compact && "gap-1.5 p-2",
        className,
      )}
    >
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = activePreset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePreset(p)}
              className={cn(
                "inline-flex items-center justify-center rounded-full border border-transparent font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                chipBase,
                active
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-card text-foreground border-input hover:bg-accent hover:text-accent-foreground",
              )}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange({ from, to, preset: "custom" })}
          className={cn(
            "inline-flex items-center justify-center rounded-full border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            chipBase,
            activePreset === "custom"
              ? "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
              : "bg-card text-foreground border-input hover:bg-accent hover:text-accent-foreground",
          )}
          aria-pressed={activePreset === "custom"}
        >
          Tuỳ chỉnh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="date-range-from"
            className={compact ? "text-xs" : "text-xs"}
          >
            Từ
          </Label>
          <Input
            id="date-range-from"
            type="date"
            value={from ?? ""}
            min={min}
            max={max}
            onChange={handleFromChange}
            className={inputHeight}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="date-range-to"
            className={compact ? "text-xs" : "text-xs"}
          >
            Đến
          </Label>
          <Input
            id="date-range-to"
            type="date"
            value={to ?? ""}
            min={min}
            max={max}
            onChange={handleToChange}
            className={inputHeight}
          />
        </div>
      </div>

      {hasValue ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className={compact ? "h-7 px-2 text-xs" : "h-7 px-2 text-xs"}
          >
            Xoá
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default DateRangePicker;
