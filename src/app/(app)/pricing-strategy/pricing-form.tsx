"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePricingAction } from "./generate-action";
import {
  COMPETITOR_AVG_MAX,
  COMPETITOR_AVG_MIN,
  COST_PER_CUP_MAX,
  COST_PER_CUP_MIN,
  INITIAL_PRICING_STATE,
  MAX_ITEMS,
  TARGET_MARGIN_MAX,
  TARGET_MARGIN_MIN,
  splitItems,
  type PricingState,
} from "./pricing-types";

const VND = new Intl.NumberFormat("vi-VN");

function formatVnd(n: number): string {
  return `${VND.format(n)} ₫`;
}

function marginPct(price: number, cost: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

function marginToneClass(pct: number, target: number): string {
  if (pct >= target) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (pct >= target - 10) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
}

export function PricingForm() {
  const [state, formAction, pending] = useActionState<PricingState, FormData>(
    generatePricingAction,
    INITIAL_PRICING_STATE,
  );

  const [costPerCupVnd, setCostPerCupVnd] = useState<string>(
    INITIAL_PRICING_STATE.values.costPerCupVnd,
  );
  const [competitorAvgVnd, setCompetitorAvgVnd] = useState<string>(
    INITIAL_PRICING_STATE.values.competitorAvgVnd,
  );
  const [targetMarginPct, setTargetMarginPct] = useState<string>(
    INITIAL_PRICING_STATE.values.targetMarginPct,
  );
  const [itemsRaw, setItemsRaw] = useState<string>(
    INITIAL_PRICING_STATE.values.itemsRaw,
  );

  const lastErrorRef = useRef<string | null>(null);

  // Mirror server-confirmed values back into the inputs after a successful run
  // so the user can tweak from the same state.
  useEffect(() => {
    if (state.suggestions !== null) {
      setCostPerCupVnd(state.values.costPerCupVnd);
      setCompetitorAvgVnd(state.values.competitorAvgVnd);
      setTargetMarginPct(state.values.targetMarginPct);
      setItemsRaw(state.values.itemsRaw);
    }
  }, [state.suggestions, state.values]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const previewItems = useMemo(() => splitItems(itemsRaw), [itemsRaw]);
  const previewCount = previewItems.length;
  const overLimit = previewCount > MAX_ITEMS;

  const suggestions = state.suggestions;
  const hasResults = suggestions !== null && suggestions.length > 0;

  const cost = state.costPerCupVnd ?? 0;
  const targetMargin = state.targetMarginPct ?? 0;

  const totals = useMemo(() => {
    if (!hasResults) return null;
    const totalRevenue = suggestions.reduce(
      (acc, s) => acc + s.suggestedPriceVnd,
      0,
    );
    const totalCost = cost * suggestions.length;
    const totalMargin = marginPct(totalRevenue, totalCost);
    return { totalRevenue, totalCost, totalMargin };
  }, [hasResults, suggestions, cost]);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="costPerCupVnd">Chi phí trung bình mỗi ly (VND)</Label>
            <Input
              id="costPerCupVnd"
              name="costPerCupVnd"
              type="number"
              inputMode="numeric"
              min={COST_PER_CUP_MIN}
              max={COST_PER_CUP_MAX}
              step={500}
              value={costPerCupVnd}
              onChange={(e) => setCostPerCupVnd(e.target.value)}
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              {COST_PER_CUP_MIN.toLocaleString("vi-VN")}
              {" - "}
              {COST_PER_CUP_MAX.toLocaleString("vi-VN")} VND
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="competitorAvgVnd">Giá trung bình của đối thủ (VND)</Label>
            <Input
              id="competitorAvgVnd"
              name="competitorAvgVnd"
              type="number"
              inputMode="numeric"
              min={COMPETITOR_AVG_MIN}
              max={COMPETITOR_AVG_MAX}
              step={1000}
              value={competitorAvgVnd}
              onChange={(e) => setCompetitorAvgVnd(e.target.value)}
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              {COMPETITOR_AVG_MIN.toLocaleString("vi-VN")}
              {" - "}
              {COMPETITOR_AVG_MAX.toLocaleString("vi-VN")} VND
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="targetMarginPct">Biên lợi nhuận mục tiêu (%)</Label>
            <Input
              id="targetMarginPct"
              name="targetMarginPct"
              type="number"
              inputMode="numeric"
              min={TARGET_MARGIN_MIN}
              max={TARGET_MARGIN_MAX}
              step={1}
              value={targetMarginPct}
              onChange={(e) => setTargetMarginPct(e.target.value)}
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              {TARGET_MARGIN_MIN}
              {" - "}
              {TARGET_MARGIN_MAX}%
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="itemsRaw">
            Danh sách món (mỗi dòng một món, hoặc cách nhau bằng dấu phẩy)
          </Label>
          <textarea
            id="itemsRaw"
            name="itemsRaw"
            value={itemsRaw}
            onChange={(e) => setItemsRaw(e.target.value)}
            rows={6}
            disabled={pending}
            placeholder={"Cà phê sữa đá\nBạc xỉu\nMatcha latte"}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            required
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <span className="text-muted-foreground">
              Tối đa {MAX_ITEMS} món, mỗi tên 2-50 ký tự, không trùng nhau.
            </span>
            <span
              className={
                overLimit
                  ? "text-destructive"
                  : previewCount === 0
                    ? "text-muted-foreground"
                    : "text-primary"
              }
            >
              {previewCount}/{MAX_ITEMS} món
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={pending || overLimit || previewCount === 0}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang tính giá..."
              : hasResults
                ? "Gợi ý lại giá"
                : "Gợi ý giá"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phân tích chi phí, đối thủ và margin để đề xuất giá...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <TrendingUp className="size-3" />
              Gợi ý giá cho {suggestions.length} món
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              Mục tiêu margin: {targetMargin}%
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((s, i) => {
              const m = marginPct(s.suggestedPriceVnd, cost);
              const tone = marginToneClass(m, targetMargin);
              return (
                <li
                  key={`${i}-${s.item}`}
                  className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold leading-snug">
                      {s.item}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tabular-nums text-primary">
                        {formatVnd(s.suggestedPriceVnd)}
                      </span>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums " +
                          tone
                        }
                      >
                        margin {m.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm italic leading-relaxed text-muted-foreground">
                    {s.reasoning}
                  </p>
                </li>
              );
            })}
          </ul>

          {totals ? (
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
              <div className="space-y-0.5">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Doanh thu nếu bán mỗi món 1 lần
                </div>
                <div className="text-lg font-semibold tabular-nums text-primary">
                  {formatVnd(totals.totalRevenue)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Tổng chi phí ({suggestions.length} ly)
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatVnd(totals.totalCost)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Margin tổng
                </div>
                <div>
                  <span
                    className={
                      "inline-block rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums " +
                      marginToneClass(totals.totalMargin, targetMargin)
                    }
                  >
                    {totals.totalMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
