"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVND } from "@/lib/utils";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  EXPENSES_EVENT,
  STORAGE_KEY,
  dayTotal,
  getAllExpenses,
  getExpenseFor,
  getLastNDaysExpenses,
  setExpenseFor,
  toIsoDate,
} from "@/lib/expenses-tracker";
import type { ExpenseCategory, ExpenseDay } from "@/lib/expenses-tracker";
import { computeExpenseStats } from "@/lib/expenses-stats";
import { ExpensesChart } from "@/components/expenses-chart";

const DAYS = 30;
const REVENUE_STORAGE_KEY = "cafe-hr-revenue";
const REVENUE_EVENT_NAME = "cafe-hr:revenue-changed";

type RevenueMap = Record<string, number>;

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

function readRevenueMap(): RevenueMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REVENUE_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: RevenueMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k !== "string") continue;
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function buildCsv(entries: ExpenseDay[]): string {
  const header = ["date", ...CATEGORY_ORDER, "total"].join(",");
  const lines = [header];
  for (const e of entries) {
    const row = [
      e.date,
      String(e.ingredients),
      String(e.utilities),
      String(e.wages),
      String(e.marketing),
      String(e.other),
      String(dayTotal(e)),
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

function monthRevenueTotal(map: RevenueMap, today: Date): number {
  const month = today.getMonth();
  const year = today.getFullYear();
  let total = 0;
  for (const [iso, amount] of Object.entries(map)) {
    const [yStr, mStr, dStr] = iso.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) continue;
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() === month && dt.getFullYear() === year && dt <= today) {
      total += amount;
    }
  }
  return total;
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

type TodayInputs = Record<ExpenseCategory, string>;

function emptyInputs(): TodayInputs {
  return {
    ingredients: "",
    utilities: "",
    wages: "",
    marketing: "",
    other: "",
  };
}

export function ExpensesDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [series, setSeries] = useState<ExpenseDay[]>([]);
  const [allEntries, setAllEntries] = useState<ExpenseDay[]>([]);
  const [todayInputs, setTodayInputs] = useState<TodayInputs>(emptyInputs);
  const [revenueMap, setRevenueMap] = useState<RevenueMap>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setSeries(getLastNDaysExpenses(DAYS));
    setAllEntries(getAllExpenses());
    const today = todayIso();
    const cur = getExpenseFor(today);
    const inputs = emptyInputs();
    if (cur) {
      for (const cat of CATEGORY_ORDER) {
        const v = cur[cat];
        inputs[cat] = v ? formatInputValue(v) : "";
      }
    }
    setTodayInputs(inputs);
  }, []);

  const refreshRevenue = useCallback(() => {
    setRevenueMap(readRevenueMap());
  }, []);

  useEffect(() => {
    setHydrated(true);
    refresh();
    refreshRevenue();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY) refresh();
      if (!e.key || e.key === REVENUE_STORAGE_KEY) refreshRevenue();
    };
    const onExpense = () => refresh();
    const onRevenue = () => refreshRevenue();

    window.addEventListener("storage", onStorage);
    window.addEventListener(EXPENSES_EVENT, onExpense);
    window.addEventListener(REVENUE_EVENT_NAME, onRevenue);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EXPENSES_EVENT, onExpense);
      window.removeEventListener(REVENUE_EVENT_NAME, onRevenue);
    };
  }, [refresh, refreshRevenue]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const stats = useMemo(() => computeExpenseStats(allEntries), [allEntries]);

  const flash = useCallback(() => {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1500);
  }, []);

  const handleInputChange = useCallback(
    (cat: ExpenseCategory, raw: string) => {
      const amount = parseAmount(raw);
      setTodayInputs((prev) => ({
        ...prev,
        [cat]: amount ? formatInputValue(amount) : "",
      }));
    },
    [],
  );

  const saveCategory = useCallback(
    (cat: ExpenseCategory, raw: string) => {
      const amount = parseAmount(raw);
      setExpenseFor(todayIso(), cat, amount);
      flash();
    },
    [flash],
  );

  const saveAll = useCallback(() => {
    const today = todayIso();
    for (const cat of CATEGORY_ORDER) {
      const amount = parseAmount(todayInputs[cat]);
      setExpenseFor(today, cat, amount);
    }
    flash();
  }, [todayInputs, flash]);

  const exportCsv = useCallback(() => {
    const csv = buildCsv(allEntries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cafe-expenses-${todayIso()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [allEntries]);

  const todayTotal = useMemo(() => {
    let t = 0;
    for (const cat of CATEGORY_ORDER) t += parseAmount(todayInputs[cat]);
    return t;
  }, [todayInputs]);

  const hasRevenueData = Object.keys(revenueMap).length > 0;
  const todayRevenue = revenueMap[todayIso()] ?? 0;
  const todayMargin = todayRevenue - todayTotal;

  const monthRevenue = useMemo(() => {
    if (!hasRevenueData) return 0;
    return monthRevenueTotal(revenueMap, new Date());
  }, [revenueMap, hasRevenueData]);

  const monthProfit = monthRevenue - stats.thisMonthTotal;

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
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
  // For expenses: increase (positive delta) is bad, decrease is good.
  const deltaTone: "positive" | "negative" | "neutral" =
    stats.weekDeltaPct == null
      ? "neutral"
      : stats.weekDeltaPct <= 0
        ? "positive"
        : "negative";

  const profitTone: "positive" | "negative" | "neutral" =
    !hasRevenueData ? "neutral" : monthProfit >= 0 ? "positive" : "negative";
  const marginTone: "positive" | "negative" | "neutral" =
    !hasRevenueData
      ? "neutral"
      : todayRevenue === 0
        ? "neutral"
        : todayMargin >= 0
          ? "positive"
          : "negative";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chi phí hôm nay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[cat] }}
                  />
                  {CATEGORY_LABEL[cat]}
                </div>
                <div className="relative">
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={todayInputs[cat]}
                    onChange={(e) => handleInputChange(cat, e.target.value)}
                    onBlur={(e) => saveCategory(cat, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveCategory(cat, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="pr-12"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                    VND
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                Tổng hôm nay:{" "}
                <span className="font-medium text-foreground">
                  {formatVND(todayTotal)}
                </span>
              </span>
              {hasRevenueData ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    marginTone === "positive"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : marginTone === "negative"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  Lợi nhuận hôm nay:{" "}
                  {todayRevenue === 0
                    ? "chưa có doanh thu"
                    : `${todayMargin >= 0 ? "+" : ""}${formatVND(todayMargin)}`}
                </span>
              ) : null}
              {savedFlash ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Đã lưu
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={saveAll}>
                Lưu tất cả
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
              : "So với tuần trước (chi phí)"
          }
          tone={deltaTone}
        />
        <StatTile
          label="Tháng này"
          value={formatVND(stats.thisMonthTotal)}
          hint="Tổng chi phí tháng đang chạy"
        />
      </div>

      {hasRevenueData ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Doanh thu tháng"
            value={formatVND(monthRevenue)}
            hint="Lấy từ trang Doanh thu"
          />
          <StatTile
            label="Lợi nhuận tháng"
            value={`${monthProfit >= 0 ? "" : ""}${formatVND(monthProfit)}`}
            hint="Doanh thu − Chi phí"
            tone={profitTone}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 text-xs text-muted-foreground">
            Mẹo: nhập doanh thu ở trang <span className="font-medium">Doanh thu</span>{" "}
            để xem lợi nhuận theo tháng và biên hằng ngày.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">30 ngày gần nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesChart data={series} />
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-5">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[cat] }}
                  />
                  {CATEGORY_LABEL[cat]}
                </span>
                <span className="font-medium text-foreground">
                  {formatVND(stats.byCategoryThisMonth[cat])}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
