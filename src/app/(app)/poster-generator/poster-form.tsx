"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePosterAction } from "./generate-action";
import {
  COLOR_MOOD_OPTIONS,
  HEADLINE_MAX,
  INITIAL_POSTER_STATE,
  STYLE_OPTIONS,
  TOPIC_MAX,
  TOPIC_MIN,
  type PosterState,
} from "./poster-types";

export function PosterForm() {
  const [state, formAction, pending] = useActionState<PosterState, FormData>(
    generatePosterAction,
    INITIAL_POSTER_STATE,
  );

  const [headlineDraft, setHeadlineDraft] = useState<string>(state.headline);
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
      setHeadlineDraft(state.headline);
    }
  }, [state.imageUrl, state.headline]);

  const hasImage = state.imageUrl !== null;

  const handleDownload = () => {
    if (!state.imageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = state.imageUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `cafe-poster-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đã mở/tải ảnh poster.");
    } catch {
      toast.error("Không tải được ảnh. Vui lòng thử lại.");
    }
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="poster-topic" className="text-sm font-medium">
            Chủ đề / sự kiện
          </Label>
          <Input
            id="poster-topic"
            name="topic"
            type="text"
            required
            minLength={TOPIC_MIN}
            maxLength={TOPIC_MAX}
            defaultValue={state.topic}
            placeholder="VD: Khai trương món bạc xỉu dừa"
          />
          <p className="text-xs text-muted-foreground">
            {TOPIC_MIN}–{TOPIC_MAX} ký tự. Mô tả ngắn gọn nội dung poster.
          </p>
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

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Tông màu</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {COLOR_MOOD_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="colorMood"
                  value={opt.value}
                  defaultChecked={opt.value === state.colorMood}
                  className="size-4"
                  required
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="poster-headline" className="text-sm font-medium">
            Headline phủ trên ảnh{" "}
            <span className="text-muted-foreground">(tuỳ chọn)</span>
          </Label>
          <Input
            id="poster-headline"
            name="headline"
            type="text"
            maxLength={HEADLINE_MAX}
            defaultValue={state.headline}
            placeholder="VD: Bạc xỉu dừa — chỉ 39K"
            onChange={(e) => setHeadlineDraft(e.target.value.slice(0, HEADLINE_MAX))}
          />
          <p className="text-xs text-muted-foreground">
            Tối đa {HEADLINE_MAX} ký tự. Headline được phủ bằng CSS sau khi
            ảnh tạo xong (không nhúng vào ảnh).
          </p>
        </fieldset>

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
                : "Tạo poster"}
          </Button>
        </div>
      </form>

      {pending && !hasImage ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác hoạ poster... khoảng 10 giây.
        </div>
      ) : null}

      {hasImage && state.imageUrl ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Poster đã tạo
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="size-4" />
                Tải ảnh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                In
              </Button>
            </div>
          </div>

          <div
            id="poster-print-area"
            className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-md"
          >
            <div className="relative aspect-square w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.imageUrl}
                alt="Poster cafe AI"
                className="h-full w-full object-cover"
              />
              {headlineDraft.trim().length > 0 ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/40 to-transparent p-4 text-3xl font-bold text-white/95 drop-shadow">
                  {headlineDraft}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #poster-print-area, #poster-print-area * { visibility: visible !important; }
          #poster-print-area {
            position: fixed !important;
            inset: 0 !important;
            margin: auto !important;
            width: 90vw !important;
            max-width: 600px !important;
          }
        }
      `}</style>
    </div>
  );
}
