"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateLogoAction } from "./generate-action";
import {
  INITIAL_LOGO_STATE,
  SYMBOL_OPTIONS,
  VIBE_OPTIONS,
  type LogoState,
} from "./logo-types";

const PROMPT_HINT_LABELS: Record<string, string> = {
  "centered iconic mark": "Mark trung tâm",
  "horizontal lockup with wordmark": "Lockup ngang",
  "badge-style emblem": "Badge huy hiệu",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function LogoForm() {
  const [state, formAction, pending] = useActionState<LogoState, FormData>(
    generateLogoAction,
    INITIAL_LOGO_STATE,
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
      const got = state.result.concepts.length;
      if (got < state.requested) {
        toast.warning(`Tạo được ${got}/${state.requested} logo.`);
      } else {
        toast.success(`Đã tạo ${got} logo concept.`);
      }
    }
  }, [state.generatedAt, state.result, state.requested]);

  const result = state.result;
  const hasResult = result !== null;

  function handleDownload(url: string, hint: string): void {
    try {
      const baseSlug = slugify(state.cafeName) || "cafe";
      const hintSlug = slugify(hint) || "logo";
      const a = document.createElement("a");
      a.href = url;
      a.download = `logo-${baseSlug}-${hintSlug}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang tải logo...");
    } catch {
      toast.error("Không thể tải logo. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cafeName">Tên quán</Label>
          <Input
            id="cafeName"
            name="cafeName"
            required
            minLength={2}
            maxLength={30}
            defaultValue={state.cafeName}
            placeholder="Ví dụ: Mây Cà Phê"
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            2-30 ký tự. Tên này sẽ xuất hiện trong logo.
          </p>
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Vibe</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {VIBE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="vibe"
                  value={opt.value}
                  defaultChecked={opt.value === state.vibe}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Loại biểu tượng</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SYMBOL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="symbol"
                  value={opt.value}
                  defaultChecked={opt.value === state.symbol}
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
              ? "Đang vẽ ~30s..."
              : hasResult
                ? "Tạo lại 3 logo"
                : "Tạo 3 logo"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác 3 logo concept song song. Có thể mất ~30 giây vì chạy
          3 yêu cầu sinh ảnh cùng lúc...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3" />
            {result.concepts.length} logo concept
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {result.concepts.map((c, i) => {
              const label =
                PROMPT_HINT_LABELS[c.promptHint] ?? c.promptHint;
              return (
                <article
                  key={`${i}-${c.promptHint}`}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="rounded-xl border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.url}
                      alt={`Logo concept ${i + 1}: ${label}`}
                      className="block aspect-square w-full rounded-md object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{label}</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(c.url, c.promptHint)}
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
