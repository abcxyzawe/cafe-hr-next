"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSeasonalDecorAction } from "./generate-action";
import {
  HOLIDAY_OPTIONS,
  INITIAL_SEASONAL_DECOR_STATE,
  PLACEMENT_LABELS,
  SEASON_OPTIONS,
  type SeasonalDecorState,
} from "./seasonal-decor-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function SeasonalDecorForm() {
  const [state, formAction, pending] = useActionState<
    SeasonalDecorState,
    FormData
  >(generateSeasonalDecorAction, INITIAL_SEASONAL_DECOR_STATE);

  const lastErrorRef = useRef<string | null>(null);
  const lastGenRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  useEffect(() => {
    if (
      state.generatedAt &&
      state.result &&
      state.generatedAt !== lastGenRef.current
    ) {
      lastGenRef.current = state.generatedAt;
      const got = state.result.concepts.length;
      if (got < state.requested) {
        toast.warning(
          `Chỉ tạo được ${got}/${state.requested} concept trang trí.`,
        );
      } else {
        toast.success(`Đã tạo ${got} concept trang trí.`);
      }
    }
  }, [state.generatedAt, state.result, state.requested]);

  const result = state.result;
  const hasResult = result !== null;

  function handleDownload(url: string, placement: string): void {
    try {
      const seasonSlug = slugify(state.season) || "season";
      const holidaySlug = slugify(state.holiday) || "holiday";
      const placeSlug = slugify(placement) || "decor";
      const a = document.createElement("a");
      a.href = url;
      a.download = `decor-${seasonSlug}-${holidaySlug}-${placeSlug}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang tải concept...");
    } catch {
      toast.error("Không thể tải concept. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Mùa</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {SEASON_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="season"
                  value={opt.value}
                  defaultChecked={opt.value === state.season}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Bối cảnh lễ hội</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {HOLIDAY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="holiday"
                  value={opt.value}
                  defaultChecked={opt.value === state.holiday}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang vẽ ~40s..."
              : hasResult
                ? "Tạo lại 4 concept"
                : "Tạo 4 concept"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác 4 concept trang trí song song cho 4 vị trí. Có thể mất
          ~40 giây vì chạy 4 yêu cầu sinh ảnh cùng lúc...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3" />
            {result.concepts.length} concept trang trí
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.concepts.map((c, i) => {
              const label = PLACEMENT_LABELS[c.placement] ?? c.placement;
              return (
                <article
                  key={`${i}-${c.placement}`}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="rounded-xl border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.url}
                      alt={`Concept trang trí ${i + 1}: ${label}`}
                      className="block aspect-square w-full rounded-md object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{label}</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(c.url, c.placement)}
                    >
                      <Download className="size-4" />
                      Tải
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
