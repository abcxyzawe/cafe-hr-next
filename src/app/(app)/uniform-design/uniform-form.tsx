"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateUniformAction } from "./generate-action";
import {
  INITIAL_UNIFORM_STATE,
  ROLE_OPTIONS,
  STYLE_OPTIONS,
  type UniformState,
} from "./uniform-types";

const ANGLE_LABELS: Record<string, string> = {
  "front-view full body": "Chính diện toàn thân",
  "detail close-up of apron and accessories":
    "Cận cảnh tạp dề & phụ kiện",
  "three-quarter side view": "Nghiêng 3/4",
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

export function UniformForm() {
  const [state, formAction, pending] = useActionState<UniformState, FormData>(
    generateUniformAction,
    INITIAL_UNIFORM_STATE,
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
        toast.warning(
          `Chỉ tạo được ${got}/${state.requested} concept đồng phục.`,
        );
      } else {
        toast.success(`Đã tạo ${got} concept đồng phục.`);
      }
    }
  }, [state.generatedAt, state.result, state.requested]);

  const result = state.result;
  const hasResult = result !== null;

  function handleDownload(url: string, angle: string): void {
    try {
      const roleSlug = slugify(state.role) || "uniform";
      const angleSlug = slugify(angle) || "concept";
      const a = document.createElement("a");
      a.href = url;
      a.download = `dong-phuc-${roleSlug}-${angleSlug}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang tải concept...");
    } catch {
      toast.error("Không thể tải ảnh. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Vị trí công việc</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  defaultChecked={opt.value === state.role}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Phong cách</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STYLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="style"
                  value={opt.value}
                  defaultChecked={opt.value === state.style}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="dominantColor">Màu chủ đạo</Label>
          <div className="flex items-center gap-3">
            <Input
              id="dominantColor"
              name="dominantColor"
              type="color"
              defaultValue={state.dominantColor}
              disabled={pending}
              className="h-10 w-20 cursor-pointer p-1"
              aria-label="Chọn màu chủ đạo"
            />
            <span className="font-mono text-xs text-muted-foreground">
              Mặc định: #6f4e37 (espresso brown). AI sẽ ưu tiên dùng màu này
              cho tông tổng thể đồng phục.
            </span>
          </div>
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
              ? "Đang vẽ ~30s..."
              : hasResult
                ? "Tạo lại 3 concept"
                : "Tạo 3 concept"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác 3 concept đồng phục song song theo 3 góc nhìn. Có thể
          mất ~30 giây vì chạy 3 yêu cầu sinh ảnh cùng lúc...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3" />
            {result.concepts.length} concept đồng phục
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {result.concepts.map((c, i) => {
              const label = ANGLE_LABELS[c.angle] ?? c.angle;
              return (
                <article
                  key={`${i}-${c.angle}`}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="rounded-xl border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.url}
                      alt={`Concept đồng phục ${i + 1}: ${label}`}
                      className="block aspect-square w-full rounded-md object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{label}</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(c.url, c.angle)}
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
