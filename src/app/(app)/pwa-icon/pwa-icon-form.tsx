"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePwaIconAction } from "./generate-action";
import {
  INITIAL_PWA_ICON_STATE,
  PWA_ICON_STYLE_OPTIONS,
  type PwaIconState,
} from "./pwa-icon-types";

const MANIFEST_PATHS: ReadonlyArray<string> = [
  "/brand/logo-96.png",
  "/brand/logo-192.png",
  "/brand/logo-512.png",
  "/icon.png",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function PwaIconForm() {
  const [state, formAction, pending] = useActionState<PwaIconState, FormData>(
    generatePwaIconAction,
    INITIAL_PWA_ICON_STATE,
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
      state.imageUrl &&
      state.generatedAt !== lastGenRef.current
    ) {
      lastGenRef.current = state.generatedAt;
      toast.success("Đã tạo icon PWA mới.");
    }
  }, [state.generatedAt, state.imageUrl]);

  const hasResult = state.imageUrl !== null;

  function handleDownload(): void {
    if (!state.imageUrl) return;
    try {
      const initialSlug = slugify(state.initial) || "icon";
      const a = document.createElement("a");
      a.href = state.imageUrl;
      a.download = `pwa-icon-${initialSlug}-${state.style}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang tải icon...");
    } catch {
      toast.error("Không thể tải icon. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="initial">Chữ initial</Label>
            <Input
              id="initial"
              name="initial"
              required
              minLength={1}
              maxLength={3}
              defaultValue={state.initial}
              placeholder="VD: C, CH, CHR"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              1-3 ký tự. Sẽ là monogram trung tâm của icon.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Màu nền</Label>
            <div className="flex items-center gap-2">
              <Input
                id="backgroundColor"
                name="backgroundColor"
                type="color"
                required
                defaultValue={state.backgroundColor}
                disabled={pending}
                className="h-10 w-20 cursor-pointer p-1"
              />
              <span className="text-sm font-mono text-muted-foreground">
                {state.backgroundColor}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Mặc định nâu cà phê <code>#6f4e37</code>.
            </p>
          </div>
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Style</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PWA_ICON_STYLE_OPTIONS.map((opt) => (
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
                ? "Tạo lại"
                : "Tạo icon"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang vẽ icon PWA. Có thể mất khoảng 10 giây...
        </div>
      ) : null}

      {hasResult && state.imageUrl ? (
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3" />
            Icon mới
          </div>

          <div className="flex flex-col items-center gap-4">
            <div
              className="w-full max-w-md rounded-2xl border bg-white p-3 shadow-sm"
              style={{ backgroundColor: state.backgroundColor }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.imageUrl}
                alt={`PWA icon ${state.initial} (${state.style})`}
                className="block aspect-square w-full rounded-xl object-contain"
              />
            </div>
            <Button type="button" variant="outline" onClick={handleDownload}>
              <Download className="size-4" />
              Tải icon (.png)
            </Button>
          </div>
        </section>
      ) : null}

      <div className="rounded-xl border bg-muted/30 p-4 text-sm">
        <div className="mb-2 font-medium">
          Đường dẫn icon trong manifest
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Sau khi tải xuống, đổi tên file theo từng kích thước rồi thay thế
          các file sau (cần chỉnh size cho khớp):
        </p>
        <ul className="space-y-1">
          {MANIFEST_PATHS.map((p) => (
            <li key={p} className="font-mono text-xs">
              <code className="rounded bg-background px-1.5 py-0.5">{p}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
