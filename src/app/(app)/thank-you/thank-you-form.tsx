"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Heart, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateThankYouAction } from "./generate-action";
import {
  INITIAL_THANK_YOU_STATE,
  THANK_YOU_CHANNELS,
  THANK_YOU_CHANNEL_LIMITS,
  THANK_YOU_CONTEXTS,
  THANK_YOU_NAME_MAX,
  type ThankYouChannelLimits,
  type ThankYouContext,
  type ThankYouState,
} from "./thank-you-types";
import type { ThankYouChannel, ThankYouMessages } from "@/lib/xai";

type Variant = keyof ThankYouMessages;

const VARIANT_META: ReadonlyArray<{
  key: Variant;
  label: string;
  hint: string;
}> = [
  { key: "short", label: "Ngắn", hint: "1-2 câu, gọn gàng" },
  { key: "medium", label: "Vừa", hint: "3-4 câu, đủ ý" },
  { key: "long", label: "Dài", hint: "5-6 câu, có ưu đãi" },
];

export function ThankYouForm() {
  const [state, formAction, pending] = useActionState<ThankYouState, FormData>(
    generateThankYouAction,
    INITIAL_THANK_YOU_STATE,
  );

  const [context, setContext] = useState<ThankYouContext>(
    INITIAL_THANK_YOU_STATE.context,
  );
  const [customerName, setCustomerName] = useState<string>(
    INITIAL_THANK_YOU_STATE.customerName,
  );
  const [channel, setChannel] = useState<ThankYouChannel>(
    INITIAL_THANK_YOU_STATE.channel,
  );

  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const nameTooLong = customerName.length > THANK_YOU_NAME_MAX;
  const limits: ThankYouChannelLimits = THANK_YOU_CHANNEL_LIMITS[channel];
  const messages = state.messages;
  const hasMessages = messages !== null;

  async function copyText(text: string, variantLabel: string) {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        toast.success(`Đã sao chép lời cảm ơn ${variantLabel.toLowerCase()}`);
      } else {
        throw new Error("Clipboard API không khả dụng");
      }
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Ngữ cảnh khách</Label>
          <div
            role="radiogroup"
            aria-label="Ngữ cảnh khách"
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {THANK_YOU_CONTEXTS.map((opt) => {
              const selected = context === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-2 text-center text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="context"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setContext(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                  <span
                    className={
                      "text-[11px] font-normal " +
                      (selected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground")
                    }
                  >
                    {opt.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="customer-name" className="text-sm font-medium">
              Tên khách{" "}
              <span className="font-normal text-muted-foreground">
                (tuỳ chọn)
              </span>
            </Label>
            <Input
              id="customer-name"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="ví dụ: chị Lan"
              disabled={pending}
              maxLength={THANK_YOU_NAME_MAX}
              aria-invalid={nameTooLong || undefined}
            />
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {customerName.length}/{THANK_YOU_NAME_MAX} ký tự
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Kênh gửi</Label>
            <div
              role="radiogroup"
              aria-label="Kênh gửi"
              className="grid grid-cols-3 gap-2"
            >
              {THANK_YOU_CHANNELS.map((opt) => {
                const selected = channel === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={
                      "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-2 text-sm font-medium transition-colors " +
                      (selected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                    }
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setChannel(opt.value)}
                      disabled={pending}
                      className="sr-only"
                    />
                    <span>{opt.label}</span>
                    <span
                      className={
                        "text-[11px] font-normal " +
                        (selected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground")
                      }
                    >
                      {opt.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={pending || nameTooLong}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasMessages ? (
              <Wand2 className="size-4" />
            ) : (
              <Heart className="size-4" />
            )}
            {pending
              ? "Đang soạn..."
              : hasMessages
                ? "Tạo lại 3 lời cảm ơn"
                : "Tạo 3 lời cảm ơn"}
          </Button>
        </div>
      </form>

      {pending && !hasMessages ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang soạn 3 phiên bản lời cảm ơn...
        </div>
      ) : null}

      {hasMessages && messages ? (
        <section className="space-y-3">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3" />
            3 phiên bản đề xuất cho kênh{" "}
            {THANK_YOU_CHANNELS.find((c) => c.value === state.channel)?.label ??
              state.channel}
          </div>

          <div className="grid gap-3">
            {VARIANT_META.map((meta) => {
              const text = messages[meta.key];
              const chars = text.length;
              const cap = limits[meta.key];
              const overCap = chars > cap;
              return (
                <article
                  key={meta.key}
                  className="space-y-2 rounded-md border bg-card/60 p-3"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-sm font-semibold">{meta.label}</h3>
                      <span className="text-[11px] text-muted-foreground">
                        {meta.hint}
                      </span>
                    </div>
                    <span
                      className={
                        "text-[11px] tabular-nums " +
                        (overCap
                          ? "text-destructive"
                          : "text-muted-foreground")
                      }
                    >
                      {chars}/{cap} ký tự
                    </span>
                  </header>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {text}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyText(text, meta.label)}
                    >
                      <Copy className="size-4" />
                      Sao chép
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
