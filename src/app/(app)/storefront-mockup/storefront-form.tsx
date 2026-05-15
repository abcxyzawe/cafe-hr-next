"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateStorefrontAction } from "./generate-action";
import {
  EMPHASIZE_OPTIONS,
  FACADE_OPTIONS,
  INITIAL_STOREFRONT_STATE,
  STYLE_OPTIONS,
  type StorefrontState,
} from "./storefront-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function StorefrontForm() {
  const [state, formAction, pending] = useActionState<
    StorefrontState,
    FormData
  >(generateStorefrontAction, INITIAL_STOREFRONT_STATE);

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
      toast.success("Đã tạo mockup mặt tiền.");
    }
  }, [state.generatedAt, state.result]);

  const result = state.result;
  const hasResult = result !== null;

  function handleDownload(url: string): void {
    try {
      const nameSlug = slugify(state.cafeName) || "cafe";
      const styleSlug = slugify(state.style) || "style";
      const a = document.createElement("a");
      a.href = url;
      a.download = `storefront-${nameSlug}-${styleSlug}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang tải ảnh mockup...");
    } catch {
      toast.error("Không thể tải ảnh. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cafeName">Tên quán (2-30 ký tự)</Label>
          <Input
            id="cafeName"
            name="cafeName"
            required
            minLength={2}
            maxLength={30}
            defaultValue={state.cafeName}
            placeholder="Ví dụ: Cà Phê Mây"
            disabled={pending}
          />
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Phong cách kiến trúc</legend>
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

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Kiểu mặt tiền</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FACADE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="facadeType"
                  value={opt.value}
                  defaultChecked={opt.value === state.facadeType}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Yếu tố nhấn mạnh</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {EMPHASIZE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="emphasize"
                  value={opt.value}
                  defaultChecked={opt.value === state.emphasize}
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
              ? "Đang vẽ ~10s..."
              : hasResult
                ? "Tạo lại mockup"
                : "Tạo mockup"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang dựng mockup mặt tiền 16:9. Quá trình mất khoảng 10 giây...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-4">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="relative aspect-video w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt={`Mockup mặt tiền ${state.cafeName}`}
                className="block size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4">
                <span
                  className="rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold tracking-wide text-foreground shadow-md"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
                >
                  {state.cafeName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDownload(result.url)}
            >
              <Download className="size-4" />
              Tải ảnh
            </Button>
            <p className="text-xs text-muted-foreground">
              Bấm <span className="font-medium">Tạo lại mockup</span> ở trên để
              sinh phương án khác.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
