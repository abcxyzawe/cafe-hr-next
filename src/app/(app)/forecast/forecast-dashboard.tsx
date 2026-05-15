"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { buildForecast, type DataPoint } from "@/lib/forecast-logic";
import { ForecastChart } from "@/components/forecast-chart";

const STORAGE_KEY = "cafe-hr-revenue";
const REVENUE_EVENT = "cafe-hr:revenue-changed";
const WINDOW_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 7, label: "7 ngày" },
  { value: 14, label: "14 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
];

function readHistory(): DataPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const out: DataPoint[] = [];
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n > 0) out.push({ date: k, amount: n });
    }
    out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return out;
  } catch {
    return [];
  }
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

export function ForecastDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [windowDays, setWindowDays] = useState<number>(30);

  const refresh = useCallback(() => {
    setHistory(readHistory());
  }, []);

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

  const forecast = useMemo(
    () => buildForecast(history, windowDays, 30),
    [history, windowDays],
  );

  const stats = useMemo(() => {
    const actuals = forecast.points
      .map((p) => p.actual)
      .filter((v): v is number => v != null && v > 0);
    const projections = forecast.points
      .map((p) => p.projected)
      .filter(
        (v, i) =>
          v != null && v > 0 && forecast.points[i].actual == null,
      ) as number[];
    const avgDaily =
      actuals.length > 0
        ? actuals.reduce((s, n) => s + n, 0) / actuals.length
        : 0;
    const projectedNext30 = projections.reduce((s, n) => s + n, 0);
    // Last-30 actual total (most recent N actuals)
    const last30 = actuals.slice(-30);
    const last30Total = last30.reduce((s, n) => s + n, 0);
    const deltaAbs = projectedNext30 - last30Total;
    const deltaPct =
      last30Total > 0 ? (deltaAbs / last30Total) * 100 : null;
    return {
      avgDaily,
      projectedNext30,
      last30Total,
      deltaAbs,
      deltaPct,
    };
  }, [forecast.points]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={TrendingUp}
            title="Chưa có dữ liệu doanh thu"
            description="Chưa có dữ liệu doanh thu — vào /revenue nhập trước."
            action={
              <Button asChild>
                <Link href="/revenue">Đi tới /revenue</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (forecast.points.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={TrendingUp}
            title="Cần thêm dữ liệu"
            description="Cần ít nhất 3 ngày có doanh thu để dự báo."
            action={
              <Button asChild>
                <Link href="/revenue">Nhập doanh thu</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const deltaText =
    stats.deltaPct == null
      ? "—"
      : `${stats.deltaPct >= 0 ? "+" : ""}${stats.deltaPct.toFixed(1)}%`;
  const deltaTone: "positive" | "negative" | "neutral" =
    stats.deltaPct == null
      ? "neutral"
      : stats.deltaPct >= 0
        ? "positive"
        : "negative";
  const rPct = `${(forecast.rSquared * 100).toFixed(0)}%`;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Cửa sổ hồi quy</div>
            <div className="text-xs text-muted-foreground">
              Số ngày gần nhất dùng để fit đường xu hướng
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={String(windowDays)}
              onChange={(e) => setWindowDays(Number(e.target.value))}
            >
              {WINDOW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="TB ngày (lịch sử)"
          value={formatVND(Math.round(stats.avgDaily))}
          hint={`Dựa trên ${forecast.windowSize} ngày có dữ liệu`}
        />
        <StatTile
          label="Dự báo 30 ngày tới"
          value={formatVND(stats.projectedNext30)}
        />
        <StatTile
          label="So với 30 ngày qua"
          value={deltaText}
          hint={
            stats.deltaPct == null
              ? "Chưa đủ dữ liệu so sánh"
              : `${stats.deltaAbs >= 0 ? "+" : ""}${formatVND(stats.deltaAbs)}`
          }
          tone={deltaTone}
        />
        <StatTile
          label="Độ khớp (R²)"
          value={rPct}
          hint={
            forecast.rSquared >= 0.7
              ? "Khớp tốt"
              : forecast.rSquared >= 0.4
                ? "Khớp tạm"
                : "Khớp yếu — cẩn thận"
          }
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Lịch sử + Dự báo (KTC 95%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart points={forecast.points} />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-[#0284c7]" />
              Thực tế
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-0.5 w-4"
                style={{
                  background:
                    "repeating-linear-gradient(90deg,#9333ea 0 4px,transparent 4px 8px)",
                }}
              />
              Dự báo
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-purple-500/20" />
              Khoảng tin cậy 95%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
