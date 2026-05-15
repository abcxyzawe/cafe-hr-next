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
import { generateAdBannerAction } from "./generate-action";
import {
  INITIAL_AD_BANNER_STATE,
  OFFER_MAX,
  PLATFORM_OPTIONS,
  STYLE_OPTIONS,
  THEME_MAX,
  THEME_MIN,
  type AdBannerState,
} from "./ad-banner-types";

export function AdBannerForm() {
  const [state, formAction, pending] = useActionState<AdBannerState, FormData>(
    generateAdBannerAction,
    INITIAL_AD_BANNER_STATE,
  );

  const [offerDraft, setOfferDraft] = useState<string>(state.offer);
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
      setOfferDraft(state.offer);
    }
  }, [state.imageUrl, state.offer]);

  const hasImage = state.imageUrl !== null;

  const handleDownload = () => {
    if (!state.imageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = state.imageUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `cafe-ad-banner-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đã mở/tải ad banner.");
    } catch {
      toast.error("Không tải được ảnh. Vui lòng thử lại.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="ad-theme" className="text-sm font-medium">
            Chủ đề chiến dịch
          </Label>
          <Input
            id="ad-theme"
            name="theme"
            type="text"
            required
            minLength={THEME_MIN}
            maxLength={THEME_MAX}
            defaultValue={state.theme}
            placeholder="VD: Khuyến mãi mùa hè cho dòng cà phê đá xay"
          />
          <p className="text-xs text-muted-foreground">
            {THEME_MIN}–{THEME_MAX} ký tự. Mô tả ngắn gọn nội dung quảng cáo.
          </p>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="ad-offer" className="text-sm font-medium">
            Offer / CTA{" "}
            <span className="text-muted-foreground">(tuỳ chọn)</span>
          </Label>
          <Input
            id="ad-offer"
            name="offer"
            type="text"
            maxLength={OFFER_MAX}
            defaultValue={state.offer}
            placeholder="VD: Giảm 30% đến hết Chủ Nhật"
            onChange={(e) => setOfferDraft(e.target.value.slice(0, OFFER_MAX))}
          />
          <p className="text-xs text-muted-foreground">
            Tối đa {OFFER_MAX} ký tự. Phủ CSS lên ảnh, không nhúng trực tiếp.
          </p>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Phong cách</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
          <legend className="text-sm font-medium">Nền tảng</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {PLATFORM_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="platform"
                  value={opt.value}
                  defaultChecked={opt.value === state.platform}
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
            ) : hasImage ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang vẽ... ~10s"
              : hasImage
                ? "Tạo lại"
                : "Tạo banner"}
          </Button>
        </div>
      </form>

      {pending && !hasImage ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác hoạ ad banner... khoảng 10 giây.
        </div>
      ) : null}

      {hasImage && state.imageUrl ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Ad banner đã tạo
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

          <div className="mx-auto w-full overflow-hidden rounded-2xl border bg-card shadow-md">
            <div className="relative aspect-[1.91/1] w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.imageUrl}
                alt="Ad banner cafe AI"
                className="h-full w-full object-cover"
              />
              {offerDraft.trim().length > 0 ? (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-end bg-gradient-to-l from-black/60 to-transparent p-6 sm:p-10">
                  <p className="max-w-full text-right text-2xl font-bold leading-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl lg:text-5xl">
                    {offerDraft}
                  </p>
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
