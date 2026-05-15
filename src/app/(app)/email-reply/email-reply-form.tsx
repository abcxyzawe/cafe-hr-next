"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  Copy,
  Loader2,
  Mail,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateReplyAction } from "./generate-action";
import {
  EMAIL_REPLY_NAME_MAX,
  EMAIL_REPLY_ORIGINAL_MAX,
  EMAIL_REPLY_ORIGINAL_MIN,
  EMAIL_REPLY_TONES,
  INITIAL_EMAIL_REPLY_STATE,
  type EmailReplyState,
} from "./email-reply-types";
import type { EmailReplyTone } from "@/lib/xai";

const PLACEHOLDER = `Chào quán,

Hôm qua mình ghé chi nhánh của quán nhưng đợi gần 25 phút mới có ly cà phê sữa đá, lúc nhận thì cà phê khá nhạt. Mong quán xem lại giúp mình.

Cảm ơn,
Lan`;

export function EmailReplyForm() {
  const [state, formAction, pending] = useActionState<
    EmailReplyState,
    FormData
  >(generateReplyAction, INITIAL_EMAIL_REPLY_STATE);

  const [original, setOriginal] = useState<string>(
    INITIAL_EMAIL_REPLY_STATE.original,
  );
  const [tone, setTone] = useState<EmailReplyTone>(
    INITIAL_EMAIL_REPLY_STATE.tone,
  );
  const [customerName, setCustomerName] = useState<string>(
    INITIAL_EMAIL_REPLY_STATE.customerName,
  );
  const [reply, setReply] = useState<string>("");

  const lastErrorRef = useRef<string | null>(null);
  const lastGeneratedAtRef = useRef<number | null>(null);

  // Sync server result into local editable state.
  useEffect(() => {
    if (
      state.reply !== null &&
      state.generatedAt !== null &&
      state.generatedAt !== lastGeneratedAtRef.current
    ) {
      lastGeneratedAtRef.current = state.generatedAt;
      setReply(state.reply);
      setOriginal(state.original);
      setTone(state.tone);
      setCustomerName(state.customerName);
    }
  }, [state.reply, state.generatedAt, state.original, state.tone, state.customerName]);

  // Toast on new errors.
  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const originalLen = original.trim().length;
  const tooShort = originalLen < EMAIL_REPLY_ORIGINAL_MIN;
  const tooLong = originalLen > EMAIL_REPLY_ORIGINAL_MAX;
  const nameTooLong = customerName.length > EMAIL_REPLY_NAME_MAX;
  const hasReply = reply.trim().length > 0;
  const replyChars = reply.length;

  function handleOriginalChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setOriginal(e.target.value);
  }

  function handleReplyChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setReply(e.target.value);
  }

  async function handleCopy() {
    if (!hasReply) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(reply);
        toast.success("Đã sao chép phản hồi vào clipboard");
      } else {
        throw new Error("Clipboard API không khả dụng");
      }
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  function handleClearReply() {
    setReply("");
    lastGeneratedAtRef.current = null;
    toast.message("Đã xoá phản hồi. Bấm \"Tạo phản hồi\" để sinh lại.");
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
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
              maxLength={EMAIL_REPLY_NAME_MAX}
              aria-invalid={nameTooLong || undefined}
            />
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {customerName.length}/{EMAIL_REPLY_NAME_MAX} ký tự
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tone phản hồi</Label>
            <div
              role="radiogroup"
              aria-label="Tone phản hồi"
              className="grid grid-cols-3 gap-2"
            >
              {EMAIL_REPLY_TONES.map((opt) => {
                const selected = tone === opt.value;
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
                      name="tone"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setTone(opt.value)}
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

        <div className="space-y-1.5">
          <Label htmlFor="email-original" className="text-sm font-medium">
            Email/tin nhắn gốc của khách
          </Label>
          <textarea
            id="email-original"
            name="original"
            value={original}
            onChange={handleOriginalChange}
            rows={8}
            disabled={pending}
            placeholder={PLACEHOLDER}
            maxLength={EMAIL_REPLY_ORIGINAL_MAX + 200}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <span className="text-muted-foreground">
              Cần {EMAIL_REPLY_ORIGINAL_MIN}-{EMAIL_REPLY_ORIGINAL_MAX} ký tự.
            </span>
            <span
              className={
                tooLong || (originalLen > 0 && tooShort)
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              {originalLen}/{EMAIL_REPLY_ORIGINAL_MAX} ký tự
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={pending || tooShort || tooLong || nameTooLong}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasReply ? (
              <Wand2 className="size-4" />
            ) : (
              <Mail className="size-4" />
            )}
            {pending
              ? "Đang soạn..."
              : hasReply
                ? "Tạo lại phản hồi"
                : "Tạo phản hồi"}
          </Button>
        </div>
      </form>

      {pending && !hasReply ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang soạn phản hồi cho bạn...
        </div>
      ) : null}

      {hasReply ? (
        <section className="space-y-3 rounded-md border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Phản hồi đề xuất (có thể chỉnh sửa)
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {replyChars.toLocaleString("vi-VN")} ký tự
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-reply" className="sr-only">
              Phản hồi đề xuất
            </Label>
            <textarea
              id="email-reply"
              value={reply}
              onChange={handleReplyChange}
              rows={12}
              disabled={pending}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearReply}
              disabled={pending}
            >
              <RotateCcw className="size-4" />
              Tạo lại
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopy}
              disabled={pending || !hasReply}
            >
              <Copy className="size-4" />
              Sao chép
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
