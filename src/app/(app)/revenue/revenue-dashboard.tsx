"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVND } from "@/lib/utils";
import {
  REVENUE_EVENT,
  STORAGE_KEY,
  getAllRevenue,
  getLastNDaysRevenue,
  getRevenueFor,
  setRevenueFor,
  toIsoDate,
} from "@/lib/revenue-tracker";
import type { RevenueEntry } from "@/lib/revenue-tracker";
import { computeRevenueStats } from "@/lib/revenue-stats";
import { RevenueChart } from "@/components/revenue-chart";

const DAYS = 30;

function todayIso(): string {
  return toIsoDate(new Date());
}

function parseAmount(text: string): number {
  const cleaned = text.replace(/[^0-9]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatInputValue(n: number): string {
  if (!n) return "";
  return n.toLocaleString("vi-VN");
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildCsv(entries: RevenueEntry[]): string {
  const lines = ["date,amount_vnd"];
  for (const e of entries) lines.push(`${e.date},${e.amount}`);
  return lines.join("\n");
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
        {hint ? (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RevenueDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [series, setSeries] = useState<RevenueEntry[]>([]);
  const [allEntries, setAllEntries] = useState<RevenueEntry[]>([]);
  const [todayInput, setTodayInput] = useState("");
  const [editing, setEditing] = useState<{ date: string; value: string } | null>(
    null,
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setSeries(getLastNDaysRevenue(DAYS));
    setAllEntries(getAllRevenue());
    const t = todayIso();
    const cur = getRevenueFor(t);
    setTodayInput(cur ? formatInputValue(cur) : "");
  }, []);

  // Hydration + cross-tab sync.
  useEffect(() => {
    setHydrated(true);
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY) refresh();
    };
    const onCustom = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener(REVENUE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVENUE_EVENT, onCustom);
    };
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const stats = useMemo(() => computeRevenueStats(allEntries), [allEntries]);

  const flash = useCallback(() => {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1500);
  }, []);

  const saveToday = useCallback(() => {
    const amount = parseAmount(todayInput);
    setRevenueFor(todayIso(), amount);
    flash();
  }, [todayInput, flash]);

  const handleTodayChange = useCallback((raw: string) => {
    const amount = parseAmount(raw);
    setTodayInput(amount ? formatInputValue(amount) : "");
  }, []);

  const onSelectDay = useCallback((dateIso: string) => {
    const cur = getRevenueFor(dateIso) ?? 0;
    setEditing({ date: dateIso, value: cur ? formatInputValue(cur) : "" });
  }, []);

  const saveEditing = useCallback(() => {
    if (!editing) return;
    const amount = parseAmount(editing.value);
    setRevenueFor(editing.date, amount);
    setEditing(null);
    flash();
  }, [editing, flash]);

  const exportCsv = useCallback(() => {
    const csv = buildCsv(allEntries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cafe-revenue-${todayIso()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [allEntries]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-[240px] w-full" />
      </div>
    );
  }

  const deltaText =
    stats.weekDeltaPct == null
      ? "—"
      : `${stats.weekDeltaPct >= 0 ? "+" : ""}${stats.weekDeltaPct.toFixed(1)}%`;
  const deltaTone: "positive" | "negative" | "neutral" =
    stats.weekDeltaPct == null
      ? "neutral"
      : stats.weekDeltaPct >= 0
        ? "positive"
        : "negative";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Doanh thu hôm nay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                inputMode="numeric"
                placeholder="0"
                value={todayInput}
                onChange={(e) => handleTodayChange(e.target.value)}
                onBlur={saveToday}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveToday();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="pr-12"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                VND
              </span>
            </div>
            <Button onClick={saveToday} type="button">
              Lưu
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportCsv}
              disabled={allEntries.length === 0}
            >
              <Download />
              Xuất CSV
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {todayInput
                ? `Đã nhập: ${formatVND(parseAmount(todayInput))}`
                : "Chưa có dữ liệu cho hôm nay"}
            </span>
            {savedFlash ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Đã lưu
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Tuần này"
          value={formatVND(stats.thisWeekTotal)}
          hint="Từ thứ Hai đến hôm nay"
        />
        <StatTile
          label="Tuần trước"
          value={formatVND(stats.lastWeekTotal)}
        />
        <StatTile
          label="Biến động tuần"
          value={deltaText}
          hint={
            stats.weekDeltaPct == null
              ? "Chưa có dữ liệu so sánh"
              : "So với tuần trước"
          }
          tone={deltaTone}
        />
        <StatTile
          label="Tháng này"
          value={formatVND(stats.thisMonthTotal)}
          hint={`TB 30 ngày: ${formatVND(Math.round(stats.dailyAverage30))}`}
        />
      </div>

      {editing ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                Sửa ngày {formatLongDate(editing.date)}
              </span>
            </div>
            <div className="relative flex-1">
              <Input
                autoFocus
                inputMode="numeric"
                placeholder="0"
                value={editing.value}
                onChange={(e) => {
                  const amount = parseAmount(e.target.value);
                  setEditing({
                    date: editing.date,
                    value: amount ? formatInputValue(amount) : "",
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveEditing();
                  } else if (e.key === "Escape") {
                    setEditing(null);
                  }
                }}
                className="pr-12"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                VND
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={saveEditing}>
                Lưu
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEditing(null)}
                aria-label="Đóng"
              >
                <X />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">30 ngày gần nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart
            data={series}
            onSelectDay={onSelectDay}
            selectedDate={editing?.date ?? null}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Mẹo: bấm vào cột bất kỳ để chỉnh sửa doanh thu của ngày đó. Cột mờ
            là ngày chưa nhập.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
