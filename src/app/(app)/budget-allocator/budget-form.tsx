"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  PieChart as PieIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BUDGET_SLICE_COLORS,
  BudgetPieChart,
} from "@/components/budget-pie-chart";
import { generateBudgetAction } from "./generate-action";
import {
  BUDGET_PHASES,
  BUDGET_TOTAL_MAX,
  BUDGET_TOTAL_MIN,
  INITIAL_BUDGET_STATE,
  type BudgetState,
} from "./budget-types";
import type { BudgetPhase } from "@/lib/xai";

const VND = new Intl.NumberFormat("vi-VN");

function formatVnd(n: number): string {
  return `${VND.format(n)} ₫`;
}

function phaseLabel(phase: BudgetPhase): string {
  const found = BUDGET_PHASES.find((p) => p.value === phase);
  return found ? found.label : phase;
}

function buildMarkdown(state: BudgetState): string {
  if (!state.allocations || state.totalVnd === null || state.phase === null) {
    return "";
  }
  const lines: string[] = [];
  lines.push(`# Phân bổ ngân sách quán cà phê`);
  lines.push("");
  lines.push(`- Tổng ngân sách tháng: **${formatVnd(state.totalVnd)}**`);
  lines.push(`- Giai đoạn: **${phaseLabel(state.phase)}**`);
  if (state.generatedAt !== null) {
    const d = new Date(state.generatedAt);
    lines.push(`- Tạo lúc: ${d.toLocaleString("vi-VN")}`);
  }
  lines.push("");
  lines.push(`| Hạng mục | % | Số tiền (VND) | Lý do |`);
  lines.push(`| --- | ---: | ---: | --- |`);
  for (const a of state.allocations) {
    const safeRationale = a.rationale.replace(/\|/g, "\\|").replace(/\n+/g, " ");
    lines.push(
      `| ${a.category} | ${a.pct}% | ${VND.format(a.amountVnd)} | ${safeRationale} |`,
    );
  }
  const totalAmt = state.allocations.reduce((acc, a) => acc + a.amountVnd, 0);
  const totalPct = state.allocations.reduce((acc, a) => acc + a.pct, 0);
  lines.push(`| **Tổng** | **${totalPct}%** | **${VND.format(totalAmt)}** | |`);
  lines.push("");
  return lines.join("\n");
}

export function BudgetForm() {
  const [state, formAction, pending] = useActionState<BudgetState, FormData>(
    generateBudgetAction,
    INITIAL_BUDGET_STATE,
  );

  const [totalVnd, setTotalVnd] = useState<string>(
    INITIAL_BUDGET_STATE.values.totalVnd,
  );
  const [phase, setPhase] = useState<BudgetPhase>(
    INITIAL_BUDGET_STATE.values.phase,
  );

  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.allocations !== null) {
      setTotalVnd(state.values.totalVnd);
      setPhase(state.values.phase);
    }
  }, [state.allocations, state.values]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const allocations = state.allocations;
  const hasResults = allocations !== null && allocations.length > 0;

  const totals = useMemo(() => {
    if (!hasResults) return null;
    const totalAmount = allocations.reduce((acc, a) => acc + a.amountVnd, 0);
    const totalPct = allocations.reduce((acc, a) => acc + a.pct, 0);
    return { totalAmount, totalPct };
  }, [hasResults, allocations]);

  const totalNumPreview = Number(totalVnd);
  const previewValid =
    Number.isFinite(totalNumPreview) &&
    totalNumPreview >= BUDGET_TOTAL_MIN &&
    totalNumPreview <= BUDGET_TOTAL_MAX;

  function handleExport() {
    const md = buildMarkdown(state);
    if (!md) return;
    try {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `phan-bo-ngan-sach-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file Markdown.");
    } catch {
      toast.error("Không xuất được file Markdown.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="totalVnd">Tổng ngân sách tháng (VND)</Label>
            <Input
              id="totalVnd"
              name="totalVnd"
              type="number"
              inputMode="numeric"
              min={BUDGET_TOTAL_MIN}
              max={BUDGET_TOTAL_MAX}
              step={100000}
              value={totalVnd}
              onChange={(e) => setTotalVnd(e.target.value)}
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              {VND.format(BUDGET_TOTAL_MIN)} - {VND.format(BUDGET_TOTAL_MAX)} VND
              {previewValid ? (
                <>
                  {" · "}
                  <span className="text-foreground tabular-nums">
                    {formatVnd(totalNumPreview)}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Giai đoạn của quán</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {BUDGET_PHASES.map((p) => {
              const checked = phase === p.value;
              return (
                <label
                  key={p.value}
                  className={
                    "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm shadow-sm transition-colors " +
                    (checked
                      ? "border-primary bg-primary/5"
                      : "border-input bg-card hover:bg-accent/30")
                  }
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="phase"
                      value={p.value}
                      checked={checked}
                      onChange={() => setPhase(p.value)}
                      className="size-4 accent-primary"
                    />
                    <span className="font-semibold">{p.label}</span>
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    {p.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || !previewValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang phân bổ..."
              : hasResults
                ? "Phân bổ lại"
                : "Phân bổ ngân sách"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phân tích cơ cấu chi phí và đề xuất tỉ trọng cho 6 hạng mục...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <PieIcon className="size-3" />
              Phân bổ {allocations.length} hạng mục
              {state.phase ? ` · ${phaseLabel(state.phase)}` : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="size-4" />
              Xuất Markdown
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-lg border bg-card/60 p-3">
              <BudgetPieChart
                data={allocations.map((a) => ({
                  category: a.category,
                  amountVnd: a.amountVnd,
                  pct: a.pct,
                }))}
              />
            </div>

            <div className="rounded-lg border bg-card/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]"></TableHead>
                    <TableHead>Hạng mục</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Lý do</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((a, i) => (
                    <TableRow key={`${i}-${a.category}`}>
                      <TableCell>
                        <span
                          className="inline-block size-3 rounded-full"
                          style={{
                            backgroundColor:
                              BUDGET_SLICE_COLORS[
                                i % BUDGET_SLICE_COLORS.length
                              ],
                          }}
                          aria-hidden
                        />
                      </TableCell>
                      <TableCell className="font-medium">{a.category}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.pct}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVnd(a.amountVnd)}
                      </TableCell>
                      <TableCell className="text-xs italic text-muted-foreground">
                        {a.rationale}
                      </TableCell>
                    </TableRow>
                  ))}
                  {totals ? (
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell></TableCell>
                      <TableCell>Tổng</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {totals.totalPct}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVnd(totals.totalAmount)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
