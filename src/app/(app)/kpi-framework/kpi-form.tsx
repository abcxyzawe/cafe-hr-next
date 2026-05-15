"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Download,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
  Target as TargetIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateKpiAction } from "./generate-action";
import {
  INITIAL_KPI_STATE,
  KPI_GOAL_MAX,
  KPI_GOAL_MIN,
  KPI_GOALS,
  KPI_STAGES,
  type KpiState,
} from "./kpi-types";
import type { KpiGoal, KpiStage } from "@/lib/xai";

function stageLabel(stage: KpiStage): string {
  const found = KPI_STAGES.find((s) => s.value === stage);
  return found ? found.label : stage;
}

function goalLabel(goal: KpiGoal): string {
  const found = KPI_GOALS.find((g) => g.value === goal);
  return found ? found.label : goal;
}

function buildMarkdown(state: KpiState): string {
  if (!state.kpis || state.stage === null || state.goals === null) {
    return "";
  }
  const lines: string[] = [];
  lines.push(`# Bộ khung KPI quán cà phê`);
  lines.push("");
  lines.push(`- Giai đoạn: **${stageLabel(state.stage)}**`);
  lines.push(
    `- Mục tiêu kinh doanh: **${state.goals.map(goalLabel).join(", ")}**`,
  );
  if (state.generatedAt !== null) {
    const d = new Date(state.generatedAt);
    lines.push(`- Tạo lúc: ${d.toLocaleString("vi-VN")}`);
  }
  lines.push("");
  state.kpis.forEach((k, i) => {
    lines.push(`## ${i + 1}. ${k.name}`);
    lines.push("");
    lines.push(`- **Định nghĩa:** ${k.definition}`);
    lines.push(`- **Ngưỡng mục tiêu:** ${k.targetRange}`);
    lines.push(`- **Tần suất đo lường:** ${k.frequency}`);
    lines.push(`- **Vì sao quan trọng:** ${k.whyItMatters}`);
    lines.push("");
  });
  return lines.join("\n");
}

export function KpiForm() {
  const [state, formAction, pending] = useActionState<KpiState, FormData>(
    generateKpiAction,
    INITIAL_KPI_STATE,
  );

  const [stage, setStage] = useState<KpiStage>(
    INITIAL_KPI_STATE.values.stage,
  );
  const [goals, setGoals] = useState<KpiGoal[]>(
    INITIAL_KPI_STATE.values.goals,
  );

  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.kpis !== null) {
      setStage(state.values.stage);
      setGoals(state.values.goals);
    }
  }, [state.kpis, state.values]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const kpis = state.kpis;
  const hasResults = kpis !== null && kpis.length > 0;
  const goalsCount = goals.length;
  const goalsValid = goalsCount >= KPI_GOAL_MIN && goalsCount <= KPI_GOAL_MAX;
  const atGoalLimit = goalsCount >= KPI_GOAL_MAX;

  function toggleGoal(goal: KpiGoal): void {
    setGoals((prev) => {
      if (prev.includes(goal)) {
        return prev.filter((g) => g !== goal);
      }
      if (prev.length >= KPI_GOAL_MAX) {
        toast.error(`Chỉ chọn tối đa ${KPI_GOAL_MAX} mục tiêu.`);
        return prev;
      }
      return [...prev, goal];
    });
  }

  function handleExport(): void {
    const md = buildMarkdown(state);
    if (!md) return;
    try {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `bo-khung-kpi-${stamp}.md`;
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
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Giai đoạn của quán</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {KPI_STAGES.map((s) => {
              const checked = stage === s.value;
              return (
                <label
                  key={s.value}
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
                      name="stage"
                      value={s.value}
                      checked={checked}
                      onChange={() => setStage(s.value)}
                      className="size-4 accent-primary"
                    />
                    <span className="font-semibold">{s.label}</span>
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    {s.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">
            Mục tiêu kinh doanh ưu tiên
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (chọn {KPI_GOAL_MIN}-{KPI_GOAL_MAX} mục — đã chọn {goalsCount})
            </span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {KPI_GOALS.map((g) => {
              const checked = goals.includes(g.value);
              const disabled = !checked && atGoalLimit;
              return (
                <label
                  key={g.value}
                  className={
                    "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm shadow-sm transition-colors " +
                    (checked
                      ? "border-primary bg-primary/5"
                      : disabled
                        ? "border-input bg-muted/40 opacity-60"
                        : "border-input bg-card hover:bg-accent/30")
                  }
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="goals"
                      value={g.value}
                      checked={checked}
                      onChange={() => toggleGoal(g.value)}
                      disabled={disabled}
                      className="size-4 accent-primary"
                    />
                    <span className="font-semibold">{g.label}</span>
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    {g.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending || !goalsValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang tạo..."
              : hasResults
                ? "Tạo lại bộ KPI"
                : "Tạo bộ KPI"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang đề xuất 5 KPI phù hợp với giai đoạn và mục tiêu của quán...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Gauge className="size-3" />
              {kpis.length} KPI
              {state.stage ? ` · ${stageLabel(state.stage)}` : null}
              {state.goals && state.goals.length > 0
                ? ` · ${state.goals.map(goalLabel).join(", ")}`
                : null}
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((k, i) => (
              <article
                key={`${i}-${k.name}`}
                className="flex h-full flex-col gap-3 rounded-xl border bg-card/60 p-4 shadow-sm"
              >
                <header className="space-y-1">
                  <h3 className="text-lg font-semibold leading-tight">
                    {k.name}
                  </h3>
                  <p className="text-sm text-foreground/85">{k.definition}</p>
                </header>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="gap-1">
                    <TargetIcon className="size-3" />
                    {k.targetRange}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="size-3" />
                    {k.frequency}
                  </Badge>
                </div>
                <p className="mt-auto text-xs italic leading-relaxed text-muted-foreground">
                  {k.whyItMatters}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
