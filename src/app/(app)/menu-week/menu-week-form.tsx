"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateWeeklyMenuAction } from "./generate-action";
import {
  INITIAL_MENU_WEEK_STATE,
  MENU_WEEK_FOCUSES,
  MENU_WEEK_SEASONS,
  menuWeekFocusLabel,
  menuWeekSeasonLabel,
  type MenuWeekState,
} from "./menu-week-types";
import type { WeeklyMenuDay } from "@/lib/xai";

const WEEKDAY_FULL: Record<string, string> = {
  T2: "Thứ Hai",
  T3: "Thứ Ba",
  T4: "Thứ Tư",
  T5: "Thứ Năm",
  T6: "Thứ Sáu",
  T7: "Thứ Bảy",
  CN: "Chủ Nhật",
};

function buildMarkdown(state: MenuWeekState, days: WeeklyMenuDay[]): string {
  const lines: string[] = [];
  lines.push(`# Menu tuần xoay vòng`);
  lines.push("");
  lines.push(`- Mùa: ${menuWeekSeasonLabel(state.season)}`);
  lines.push(`- Chủ đề: ${menuWeekFocusLabel(state.focus)}`);
  if (state.generatedAt) {
    const d = new Date(state.generatedAt);
    lines.push(`- Tạo lúc: ${d.toLocaleString("vi-VN")}`);
  }
  lines.push("");
  for (const day of days) {
    const full = WEEKDAY_FULL[day.weekday] ?? day.weekday;
    lines.push(`## ${full} (${day.weekday}) — ${day.name}`);
    lines.push("");
    lines.push(day.description);
    lines.push("");
  }
  return lines.join("\n");
}

function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function MenuWeekForm() {
  const [state, formAction, pending] = useActionState<MenuWeekState, FormData>(
    generateWeeklyMenuAction,
    INITIAL_MENU_WEEK_STATE,
  );

  const [season, setSeason] = useState<MenuWeekState["season"]>(
    INITIAL_MENU_WEEK_STATE.season,
  );
  const [focus, setFocus] = useState<MenuWeekState["focus"]>(
    INITIAL_MENU_WEEK_STATE.focus,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.days !== null) {
      setSeason(state.season);
      setFocus(state.focus);
    }
  }, [state.days, state.season, state.focus]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const days = state.days;
  const hasResults = days !== null && days.length > 0;

  const handleDownload = useCallback(() => {
    if (!days || days.length === 0) return;
    const md = buildMarkdown(state, days);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadMarkdown(`menu-tuan-${state.season}-${state.focus}-${stamp}.md`, md);
    toast.success("Đã tải file Markdown");
  }, [days, state]);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Mùa</Label>
          <div
            role="radiogroup"
            aria-label="Mùa"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {MENU_WEEK_SEASONS.map((opt) => {
              const selected = season === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="season"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setSeason(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="menu-week-focus" className="text-sm font-medium">
            Chủ đề trọng tâm
          </Label>
          <Select
            id="menu-week-focus"
            name="focus"
            value={focus}
            onChange={(e) => {
              const v = e.target.value;
              const match = MENU_WEEK_FOCUSES.find((f) => f.value === v);
              if (match) setFocus(match.value);
            }}
            disabled={pending}
          >
            {MENU_WEEK_FOCUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasResults ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={pending}
            >
              <Download className="size-4" />
              Tải .md
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang lập menu..."
              : hasResults
                ? "Tạo lại menu tuần"
                : "Tạo menu tuần"}
          </Button>
        </div>
      </form>

      {pending && !hasResults ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang lập menu 7 ngày cho bạn...
        </div>
      ) : null}

      {hasResults ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <CalendarDays className="size-3" />
              Menu tuần — {menuWeekSeasonLabel(state.season)} ·{" "}
              {menuWeekFocusLabel(state.focus)}
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {days.length} ngày
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {days.map((day) => {
              const full = WEEKDAY_FULL[day.weekday] ?? day.weekday;
              return (
                <li
                  key={day.weekday}
                  className="flex flex-col gap-2 rounded-lg border bg-card/60 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {day.weekday}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {full}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold leading-snug">
                    {day.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {day.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
