"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateGreetingCardAction } from "./generate-action";
import {
  INITIAL_GREETING_CARD_STATE,
  OCCASION_OPTIONS,
  RECIPIENT_MAX,
  TONE_OPTIONS,
  type GreetingCardState,
} from "./greeting-card-types";

export function GreetingCardForm() {
  const [state, formAction, pending] = useActionState<
    GreetingCardState,
    FormData
  >(generateGreetingCardAction, INITIAL_GREETING_CARD_STATE);

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

  const hasResult =
    state.imageUrl !== null && state.message !== null && !pending;

  const handleDownload = () => {
    if (!state.imageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = state.imageUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `cafe-greeting-${state.occasion}-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đã mở/tải ảnh thiệp.");
    } catch {
      toast.error("Không tải được ảnh. Vui lòng thử lại.");
    }
  };

  const handleCopyMessage = async () => {
    if (!state.message) return;
    try {
      await navigator.clipboard.writeText(state.message);
      toast.success("Đã sao chép lời chúc.");
    } catch {
      toast.error("Không sao chép được. Vui lòng thử lại.");
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
          <Label htmlFor="greeting-occasion" className="text-sm font-medium">
            Dịp
          </Label>
          <Select
            id="greeting-occasion"
            name="occasion"
            defaultValue={state.occasion}
            required
          >
            {OCCASION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <Label htmlFor="greeting-recipient" className="text-sm font-medium">
            Tên người nhận{" "}
            <span className="text-muted-foreground">(tuỳ chọn)</span>
          </Label>
          <Input
            id="greeting-recipient"
            name="recipientName"
            type="text"
            maxLength={RECIPIENT_MAX}
            defaultValue={state.recipientName}
            placeholder="VD: Anh Nam, Chị Lan, Quý khách"
          />
          <p className="text-xs text-muted-foreground">
            Tối đa {RECIPIENT_MAX} ký tự. Bỏ trống nếu muốn lời chúc chung.
          </p>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Giọng văn</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {TONE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card/50 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="tone"
                  value={opt.value}
                  defaultChecked={opt.value === state.tone}
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
              ? "Đang vẽ ~15s..."
              : hasResult
                ? "Tạo lại"
                : "Tạo thiệp"}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang viết lời chúc và phác hoạ nền thiệp... khoảng 15 giây.
        </div>
      ) : null}

      {hasResult && state.imageUrl && state.message ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Thiệp đã tạo
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyMessage}
              >
                <ClipboardCopy className="size-4" />
                Chép lời chúc
              </Button>
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
            id="greeting-card-print-area"
            className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-md"
          >
            <div
              className="relative aspect-square w-full bg-muted bg-cover bg-center"
              style={{ backgroundImage: `url(${state.imageUrl})` }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/10 via-black/30 to-black/10 p-8">
                <p className="max-w-[85%] text-center text-lg font-semibold leading-relaxed text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] md:text-xl">
                  {state.message}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #greeting-card-print-area, #greeting-card-print-area * { visibility: visible !important; }
          #greeting-card-print-area {
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
