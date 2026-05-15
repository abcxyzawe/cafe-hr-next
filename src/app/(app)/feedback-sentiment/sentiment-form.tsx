"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { analyzeSentimentAction } from "./analyze-action";
import {
  INITIAL_SENTIMENT_STATE,
  MAX_FEEDBACK_LENGTH,
  MIN_FEEDBACK_LENGTH,
  type SentimentFormState,
} from "./sentiment-types";
import type { SentimentLabel } from "@/lib/xai";

const SAMPLE_FEEDBACK =
  "Mình ghé quán chiều nay, không gian rất ấm cúng và nhân viên bạn nữ tóc ngắn cực kỳ thân thiện. Cà phê sữa đá thơm vừa miệng, tuy nhiên bánh croissant hơi khô và phải đợi gần 15 phút mới có đồ. Wifi cũng chập chờn nên khó làm việc. Nhìn chung sẽ quay lại nếu cải thiện tốc độ phục vụ.";

function scoreColor(score: number): {
  text: string;
  bg: string;
  ring: string;
  badge: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
} {
  if (score > 0.3) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500",
      ring: "ring-emerald-400/40",
      badge: "success",
    };
  }
  if (score < -0.3) {
    return {
      text: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500",
      ring: "ring-rose-400/40",
      badge: "destructive",
    };
  }
  return {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500",
    ring: "ring-amber-400/40",
    badge: "warning",
  };
}

function labelEmoji(label: SentimentLabel): string {
  if (label === "tích cực") return "🙂";
  if (label === "tiêu cực") return "🙁";
  return "😐";
}

export function SentimentForm() {
  const [state, formAction, pending] = useActionState<
    SentimentFormState,
    FormData
  >(analyzeSentimentAction, INITIAL_SENTIMENT_STATE);

  const [text, setText] = useState<string>(INITIAL_SENTIMENT_STATE.text);
  const lastErrorRef = useRef<string | null>(null);
  const lastAnalyzedAtRef = useRef<number | null>(null);

  // Sync echoed text from server when a fresh result arrives.
  useEffect(() => {
    if (
      state.analyzedAt !== null &&
      state.analyzedAt !== lastAnalyzedAtRef.current
    ) {
      lastAnalyzedAtRef.current = state.analyzedAt;
      setText(state.text);
    }
  }, [state.analyzedAt, state.text]);

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

  const trimmedLen = text.trim().length;
  const tooShort = trimmedLen > 0 && trimmedLen < MIN_FEEDBACK_LENGTH;
  const tooLong = text.length > MAX_FEEDBACK_LENGTH;
  const canSubmit =
    !pending &&
    trimmedLen >= MIN_FEEDBACK_LENGTH &&
    text.length <= MAX_FEEDBACK_LENGTH;

  const analysis = state.analysis;

  // Convert score in [-1, 1] to 0%-100% bar position.
  const barPosition = useMemo(() => {
    if (!analysis) return 50;
    const clamped = Math.max(-1, Math.min(1, analysis.score));
    return ((clamped + 1) / 2) * 100;
  }, [analysis]);

  const colors = analysis ? scoreColor(analysis.score) : null;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="feedback-text" className="text-sm font-medium">
              Nội dung phản hồi
            </Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setText(SAMPLE_FEEDBACK)}
              disabled={pending}
            >
              <Wand2 className="size-4" />
              Nạp ví dụ
            </Button>
          </div>
          <textarea
            id="feedback-text"
            name="text"
            rows={5}
            maxLength={MAX_FEEDBACK_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={pending}
            placeholder="Ví dụ: Quán đông quá phải chờ lâu, nhưng nhân viên rất nhiệt tình..."
            className={cn(
              "flex min-h-28 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
              (tooShort || tooLong) && "border-destructive",
            )}
          />
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                "text-muted-foreground",
                tooShort && "text-destructive",
              )}
            >
              {tooShort
                ? `Cần ít nhất ${MIN_FEEDBACK_LENGTH} ký tự`
                : `Tối thiểu ${MIN_FEEDBACK_LENGTH} ký tự`}
            </span>
            <span
              className={cn(
                "tabular-nums text-muted-foreground",
                tooLong && "text-destructive",
              )}
            >
              {text.length}/{MAX_FEEDBACK_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={!canSubmit}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending ? "Đang phân tích..." : "Phân tích"}
          </Button>
        </div>
      </form>

      {pending && !analysis ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang đọc và phân tích phản hồi...
        </div>
      ) : null}

      {analysis && colors ? (
        <section className="space-y-5 rounded-xl border bg-card/60 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Kết quả phân tích
            </div>
            <Badge variant={colors.badge} className="capitalize">
              {labelEmoji(analysis.label)} {analysis.label}
            </Badge>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-5xl font-bold tabular-nums tracking-tight",
                  colors.text,
                )}
              >
                {analysis.score >= 0 ? "+" : ""}
                {analysis.score.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">/ 1.00</span>
            </div>
            <p className="text-xs text-muted-foreground sm:text-right">
              Thang điểm cảm xúc từ -1 (rất tiêu cực) đến +1 (rất tích cực).
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-200 dark:from-rose-900/40 dark:via-amber-900/40 dark:to-emerald-900/40">
              {/* center 0 marker */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground/30" />
              <div
                className={cn(
                  "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 shadow",
                  colors.bg,
                  colors.ring,
                )}
                style={{ left: `${barPosition}%` }}
                aria-hidden
              />
            </div>
            <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>-1 tiêu cực</span>
              <span>0 trung tính</span>
              <span>+1 tích cực</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Chủ đề chính</h3>
            <ul className="flex flex-wrap gap-2">
              {analysis.themes.map((theme, idx) => (
                <li
                  key={`${idx}-${theme}`}
                  className="rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground"
                >
                  {theme}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Lightbulb className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Đề xuất hành động
              </p>
              <p className="text-sm leading-relaxed">{analysis.suggestion}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
