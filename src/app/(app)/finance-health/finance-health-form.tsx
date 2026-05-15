"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Coins,
  Loader2,
  ListChecks,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import {
  getAllRevenue,
  REVENUE_EVENT,
  STORAGE_KEY as REVENUE_KEY,
  toIsoDate,
} from "@/lib/revenue-tracker";
import {
  dayTotal,
  getAllExpenses,
  EXPENSES_EVENT,
  STORAGE_KEY as EXPENSES_KEY,
} from "@/lib/expenses-tracker";
import { analyzeFinanceAction } from "./analyze-action";
import {
  INITIAL_FINANCE_HEALTH_STATE,
  type FinanceHealthState,
} from "./finance-health-types";

type Totals = {
  revenueWeek: number;
  revenueMonth: number;
  expensesWeek: number;
  expensesMonth: number;
};

const ZERO_TOTALS: Totals = {
  revenueWeek: 0,
  revenueMonth: 0,
  expensesWeek: 0,
  expensesMonth: 0,
};

function computeTotals(): Totals {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6); // last 7 days inclusive
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayIso = toIsoDate(today);
  const weekStartIso = toIsoDate(weekStart);
  const monthStartIso = toIsoDate(monthStart);

  const revenue = getAllRevenue();
  let revenueWeek = 0;
  let revenueMonth = 0;
  for (const r of revenue) {
    if (r.date < monthStartIso || r.date > todayIso) continue;
    revenueMonth += r.amount;
    if (r.date >= weekStartIso) revenueWeek += r.amount;
  }

  const expenses = getAllExpenses();
  let expensesWeek = 0;
  let expensesMonth = 0;
  for (const e of expenses) {
    if (e.date < monthStartIso || e.date > todayIso) continue;
    const total = dayTotal(e);
    expensesMonth += total;
    if (e.date >= weekStartIso) expensesWeek += total;
  }

  return {
    revenueWeek: Math.round(revenueWeek),
    revenueMonth: Math.round(revenueMonth),
    expensesWeek: Math.round(expensesWeek),
    expensesMonth: Math.round(expensesMonth),
  };
}

function scoreColor(score: number): {
  ring: string;
  text: string;
  bg: string;
  label: string;
} {
  if (score >= 80) {
    return {
      ring: "stroke-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "from-emerald-500/15 to-emerald-500/5",
      label: "Rất tốt",
    };
  }
  if (score >= 60) {
    return {
      ring: "stroke-sky-500",
      text: "text-sky-600 dark:text-sky-400",
      bg: "from-sky-500/15 to-sky-500/5",
      label: "Khá tốt",
    };
  }
  if (score >= 40) {
    return {
      ring: "stroke-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      bg: "from-amber-500/15 to-amber-500/5",
      label: "Cần lưu ý",
    };
  }
  return {
    ring: "stroke-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    bg: "from-rose-500/15 to-rose-500/5",
    label: "Báo động",
  };
}

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);
  const colors = scoreColor(clamped);

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-br ${colors.bg} p-6 shadow-sm`}
    >
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle
            cx="90"
            cy="90"
            r={radius}
            className="stroke-muted"
            strokeWidth="14"
            fill="none"
          />
          <circle
            cx="90"
            cy="90"
            r={radius}
            className={colors.ring}
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 700ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-5xl font-bold tabular-nums leading-none ${colors.text}`}
          >
            {clamped}
          </span>
          <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            / 100
          </span>
        </div>
      </div>
      <div
        className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${colors.text}`}
      >
        <Sparkles className="size-4" />
        {colors.label}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  subtle,
  icon,
  hydrated,
}: {
  label: string;
  value: number;
  subtle: string;
  icon: React.ReactNode;
  hydrated: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card/60 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums text-foreground">
        {hydrated ? formatVND(value) : "—"}
      </div>
      <div className="text-[11px] text-muted-foreground">{subtle}</div>
    </div>
  );
}

export function FinanceHealthForm() {
  const [state, formAction, pending] = useActionState<
    FinanceHealthState,
    FormData
  >(analyzeFinanceAction, INITIAL_FINANCE_HEALTH_STATE);

  const [hydrated, setHydrated] = useState(false);
  const [totals, setTotals] = useState<Totals>(ZERO_TOTALS);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    setTotals(computeTotals());

    const recompute = () => setTotals(computeTotals());
    const onStorage = (e: StorageEvent) => {
      if (e.key === REVENUE_KEY || e.key === EXPENSES_KEY || e.key === null) {
        recompute();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(REVENUE_EVENT, recompute);
    window.addEventListener(EXPENSES_EVENT, recompute);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVENUE_EVENT, recompute);
      window.removeEventListener(EXPENSES_EVENT, recompute);
    };
  }, []);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) lastErrorRef.current = null;
  }, [state.error]);

  const result = state.result;
  const hasResult = result !== null;

  const ratio = useMemo(() => {
    if (totals.revenueMonth <= 0) return null;
    return Math.round(
      ((totals.expensesMonth + state.payrollMonth) / totals.revenueMonth) *
        100,
    );
  }, [totals.revenueMonth, totals.expensesMonth, state.payrollMonth]);

  const canSubmit =
    hydrated &&
    !pending &&
    (totals.revenueMonth > 0 ||
      totals.expensesMonth > 0 ||
      totals.revenueWeek > 0 ||
      totals.expensesWeek > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Doanh thu 7 ngày"
          value={totals.revenueWeek}
          subtle="Từ thiết bị này"
          icon={<TrendingUp className="size-3" />}
          hydrated={hydrated}
        />
        <StatTile
          label="Doanh thu tháng"
          value={totals.revenueMonth}
          subtle="Tháng hiện tại"
          icon={<TrendingUp className="size-3" />}
          hydrated={hydrated}
        />
        <StatTile
          label="Chi phí 7 ngày"
          value={totals.expensesWeek}
          subtle="Từ thiết bị này"
          icon={<Receipt className="size-3" />}
          hydrated={hydrated}
        />
        <StatTile
          label="Chi phí tháng"
          value={totals.expensesMonth}
          subtle="Tháng hiện tại"
          icon={<Receipt className="size-3" />}
          hydrated={hydrated}
        />
      </div>

      {hydrated && hasResult ? (
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Coins className="size-3.5" />
            Lương tháng:{" "}
            <span className="font-semibold text-foreground">
              {formatVND(state.payrollMonth)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="size-3.5" />
            Lương tháng trước:{" "}
            <span className="font-semibold text-foreground">
              {formatVND(state.payrollPrevMonth)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5" />
            Tỉ lệ chi/doanh thu:{" "}
            <span className="font-semibold text-foreground">
              {ratio === null ? "—" : `${ratio}%`}
            </span>
          </div>
        </div>
      ) : null}

      <form action={formAction} className="flex items-center justify-end gap-2">
        <input
          type="hidden"
          name="revenueWeek"
          value={String(totals.revenueWeek)}
        />
        <input
          type="hidden"
          name="revenueMonth"
          value={String(totals.revenueMonth)}
        />
        <input
          type="hidden"
          name="expensesWeek"
          value={String(totals.expensesWeek)}
        />
        <input
          type="hidden"
          name="expensesMonth"
          value={String(totals.expensesMonth)}
        />
        <Button type="submit" disabled={!canSubmit}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : hasResult ? (
            <RefreshCw className="size-4" />
          ) : (
            <Wand2 className="size-4" />
          )}
          {pending
            ? "Đang phân tích..."
            : hasResult
              ? "Phân tích lại"
              : "Phân tích AI"}
        </Button>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang đánh giá sức khỏe tài chính của quán...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-center">
            <ScoreGauge score={result.score} />
            <div className="space-y-2 rounded-2xl border bg-card/60 p-5 shadow-sm">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="size-3.5" />
                Tóm tắt sức khỏe
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Điểm số dựa trên doanh thu, chi phí (lưu cục bộ) và quỹ lương
                trong tháng so với tháng trước. Số càng cao càng tốt; dưới 60
                cần xem lại cấu trúc chi phí hoặc đẩy doanh thu.
              </p>
              <p className="text-[11px] text-muted-foreground">
                {state.employeeCount} nhân viên · Tỉ lệ chi/doanh thu:{" "}
                {ratio === null ? "—" : `${ratio}%`}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-emerald-500/5 p-4 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-3.5" />
                Điểm mạnh
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                {result.strengths.map((s, i) => (
                  <li key={`s-${i}`} className="flex gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-rose-500/5 p-4 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                <AlertTriangle className="size-3.5" />
                Rủi ro
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                {result.risks.map((r, i) => (
                  <li key={`r-${i}`} className="flex gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-rose-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-sky-500/5 p-4 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                <ListChecks className="size-3.5" />
                Việc cần làm
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                {result.actions.map((a, i) => (
                  <li key={`a-${i}`} className="flex gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-500" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
