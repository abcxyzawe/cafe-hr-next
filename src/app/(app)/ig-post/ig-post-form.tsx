"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateIgPostAction } from "./generate-action";
import {
  DEFAULT_ACCENT,
  INITIAL_IG_POST_STATE,
  OVERLAY_MAX,
  TOPIC_MAX,
  TOPIC_MIN,
  VIBE_OPTIONS,
  type IgPostState,
} from "./ig-post-types";

export function IgPostForm() {
  const [state, formAction, pending] = useActionState<IgPostState, FormData>(
    generateIgPostAction,
    INITIAL_IG_POST_STATE,
  );

  const [overlayDraft, setOverlayDraft] = useState<string>(state.overlay);
  const [accentDraft, setAccentDraft] = useState<string>(
    state.accent || DEFAULT_ACCENT,
  );
  const lastErrorRef = useRef<string | null>(null);
  const lastImageRef = useRef<string | null>(null);

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
    if (state.imageUrl && state.imageUrl !== lastImageRef.current) {
      lastImageRef.current = state.imageUrl;
      setOverlayDraft(state.overlay);
      setAccentDraft(state.accent || DEFAULT_ACCENT);
    }
  }, [state.imageUrl, state.overlay, state.accent]);

  const hasImage = state.imageUrl !== null;

  const handleDownload = () => {
    if (!state.imageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = state.imageUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `cafe-ig-post-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đã mở/tải ảnh IG post.");
    } catch {
      toast.error("Không tải được ảnh. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="ig-topic" className="text-sm font-medium">
            Chủ đề / nội dung
          </Label>
          <Input
            id="ig-topic"
            name="topic"
            type="text"
            required
            minLength={TOPIC_MIN}
            maxLength={TOPIC_MAX}
            defaultValue={state.topic}
            placeholder="VD: Bạc xỉu trân châu mới"
          />
          <p className="text-xs text-muted-foreground">
            {TOPIC_MIN}–{TOPIC_MAX} ký tự. Mô tả ngắn gọn nội dung post.
          </p>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Vibe</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset className="space-y-2" disabled={pending}>
            <Label htmlFor="ig-accent" className="text-sm font-medium">
              Màu nhấn
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="ig-accent"
                name="accent"
                type="color"
                value={accentDraft}
                onChange={(e) => setAccentDraft(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <span className="font-mono text-xs text-muted-foreground">
                {accentDraft}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Hiển thị thành chấm tròn nhỏ trên overlay.
            </p>
          </fieldset>

          <fieldset className="space-y-2" disabled={pending}>
            <Label htmlFor="ig-overlay" className="text-sm font-medium">
              Overlay text{" "}
              <span className="text-muted-foreground">(tuỳ chọn)</span>
            </Label>
            <Input
              id="ig-overlay"
              name="overlay"
              type="text"
              maxLength={OVERLAY_MAX}
              defaultValue={state.overlay}
              placeholder="VD: Bạc xỉu trân châu — chỉ 35K"
              onChange={(e) =>
                setOverlayDraft(e.target.value.slice(0, OVERLAY_MAX))
              }
            />
            <p className="text-xs text-muted-foreground">
              Tối đa {OVERLAY_MAX} ký tự. Phủ CSS, không nhúng vào ảnh.
            </p>
          </fieldset>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasImage ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang vẽ... ~10s"
              : hasImage
                ? "Tạo lại"
                : "Tạo IG post"}
          </Button>
        </div>
      </form>

      {pending && !hasImage ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác hoạ IG post... khoảng 10 giây.
        </div>
      ) : null}

      {hasImage && state.imageUrl ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              IG post đã tạo
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="size-4" />
                Tải ảnh
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-md">
            <div className="relative aspect-square w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.imageUrl}
                alt="IG post cafe AI"
                className="h-full w-full object-cover"
              />
              {overlayDraft.trim().length > 0 ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-white/40"
                      style={{ backgroundColor: accentDraft }}
                    />
                    <p className="text-lg font-semibold leading-snug text-white drop-shadow sm:text-xl">
                      {overlayDraft}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Right-click → Lưu ảnh nếu Tải không hoạt động
          </p>
        </section>
      ) : null}
    </div>
  );
}
