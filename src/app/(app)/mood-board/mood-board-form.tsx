"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, Pin, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addItem } from "@/lib/vision-board-state";
import { generateMoodBoardAction } from "./generate-action";
import {
  INITIAL_MOOD_BOARD_STATE,
  THEME_OPTIONS,
  VARIANT_LABELS,
  parseKeywords,
  type MoodBoardState,
} from "./mood-board-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function MoodBoardForm() {
  const [state, formAction, pending] = useActionState<MoodBoardState, FormData>(
    generateMoodBoardAction,
    INITIAL_MOOD_BOARD_STATE,
  );

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
      const got = state.result.images.length;
      if (got < state.requested) {
        toast.warning(
          `Tạo được ${got}/${state.requested} ảnh mood board (một vài variant lỗi).`,
        );
      } else {
        toast.success(`Đã tạo ${got} ảnh mood board.`);
      }
    }
  }, [state.generatedAt, state.result, state.requested]);

  const result = state.result;
  const hasResult = result !== null;

  const themeOpt = THEME_OPTIONS.find((o) => o.value === state.theme);
  const themeLabel = themeOpt ? themeOpt.label : state.theme;
  const themeShort = themeOpt ? themeOpt.prompt : state.theme;

  function handleDownload(url: string, variant: string): void {
    try {
      const themeSlug = slugify(state.theme) || "mood";
      const variantSlug = slugify(variant) || "image";
      const a = document.createElement("a");
      a.href = url;
      a.download = `mood-${themeSlug}-${variantSlug}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang tải ảnh mood board...");
    } catch {
      toast.error("Không thể tải ảnh. Vui lòng thử lại.");
    }
  }

  function handlePin(url: string): void {
    try {
      addItem({
        type: "image",
        content: url,
        caption: `Mood board: ${themeShort}`,
        mood: "warm",
      });
      toast.success("Đã pin ảnh về Vision Board.");
    } catch {
      toast.error("Không thể pin ảnh. Vui lòng thử lại.");
    }
  }

  const keywordCount = parseKeywords(state.keywordsRaw).length;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Aesthetic theme</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="theme"
                  value={opt.value}
                  defaultChecked={opt.value === state.theme}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="keywords">Từ khoá (1-5, ngăn cách bằng dấu phẩy)</Label>
          <Input
            id="keywords"
            name="keywords"
            required
            maxLength={200}
            defaultValue={state.keywordsRaw}
            placeholder="Ví dụ: gỗ, cà phê, cây xanh"
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Mỗi từ khoá 2-30 ký tự. Sẽ được nhúng vào cả 4 prompt để giữ
            cohesion.
          </p>
        </div>

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
                ? "Tạo lại mood board"
                : "Tạo mood board"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang dựng 4 ảnh mood board song song. Có thể mất ~40 giây vì chạy
          4 yêu cầu sinh ảnh cùng lúc...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              {result.images.length} ảnh · {themeLabel}
              {keywordCount > 0 ? ` · ${keywordCount} từ khoá` : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.images.map((img, i) => {
              const label = VARIANT_LABELS[img.variant] ?? img.variant;
              return (
                <article
                  key={`${i}-${img.variant}`}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="rounded-xl border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Mood board ${i + 1}: ${label}`}
                      className="block aspect-square w-full rounded-md object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(img.url, img.variant)}
                      >
                        <Download className="size-4" />
                        Tải
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePin(img.url)}
                      >
                        <Pin className="size-4" />
                        Pin về Vision
                      </Button>
                    </div>
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
