"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Gauge,
  Heart,
  Languages,
  ListChecks,
  Loader2,
  MessageCircleHeart,
  Printer,
  RefreshCw,
  Smile,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateReviewResponderAction } from "./generate-action";
import {
  CUSTOMER_NAME_MAX,
  INITIAL_REVIEW_RESPONDER_STATE,
  LANGUAGE_OPTIONS,
  PLATFORM_OPTIONS,
  RATING_OPTIONS,
  RESPONSE_KEYS,
  RESPONSE_META,
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
  SENTIMENT_LABEL_VI,
  type ResponseKey,
  type ReviewResponderState,
} from "./types";

const TEXTAREA_CLASS =
  "flex min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function scoreToPercent(score: number): number {
  // map [-1, 1] -> [0, 100]
  const normalized = (score + 1) / 2;
  return Math.round(clamp01(normalized) * 100);
}

function platformLabelFor(value: string): string {
  return (
    PLATFORM_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

function languageLabelFor(value: string): string {
  return (
    LANGUAGE_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

function buildMarkdown(state: ReviewResponderState): string {
  const result = state.result;
  if (!result) return "";
  const lines: string[] = [];
  lines.push("# Phản hồi đánh giá khách hàng");
  lines.push("");
  lines.push(`- **Nền tảng:** ${platformLabelFor(state.values.platform)}`);
  lines.push(`- **Số sao:** ${state.values.rating}/5`);
  if (state.values.customerName.trim().length > 0) {
    lines.push(`- **Tên khách:** ${state.values.customerName.trim()}`);
  }
  lines.push(
    `- **Ngôn ngữ phản hồi:** ${languageLabelFor(state.values.language)}`,
  );
  if (state.generatedAt !== null) {
    lines.push(
      `- **Tạo lúc:** ${new Date(state.generatedAt).toLocaleString("vi-VN")}`,
    );
  }
  lines.push("");
  lines.push("## Đánh giá gốc");
  lines.push("");
  lines.push(`> ${state.values.reviewText.trim().replace(/\n+/g, "\n> ")}`);
  lines.push("");
  lines.push("## Phân tích cảm xúc");
  lines.push("");
  lines.push(`- **Nhãn:** ${SENTIMENT_LABEL_VI[result.sentiment.label]}`);
  lines.push(
    `- **Điểm cảm xúc:** ${result.sentiment.score.toFixed(2)} (thang -1..1)`,
  );
  lines.push(
    `- **Độ tự tin:** ${(result.sentiment.confidence * 100).toFixed(0)}%`,
  );
  lines.push("");
  if (result.detectedIssues.length > 0) {
    lines.push("### Vấn đề chính");
    result.detectedIssues.forEach((s, i) => {
      lines.push(`${i + 1}. ${s}`);
    });
    lines.push("");
  }
  lines.push("### Hành động đề xuất cho đội ngũ");
  result.suggestedActions.forEach((s, i) => {
    lines.push(`${i + 1}. ${s}`);
  });
  lines.push("");
  lines.push("## Các phản hồi gợi ý");
  lines.push("");
  RESPONSE_KEYS.forEach((key) => {
    lines.push(`### ${RESPONSE_META[key].title}`);
    lines.push("");
    lines.push(result.responses[key]);
    lines.push("");
  });
  return lines.join("\n");
}

function StarRow({
  value,
  size,
}: {
  value: number;
  size: "sm" | "md" | "lg";
}) {
  const px = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <Star
            key={n}
            className={`${px} ${
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40"
            }`}
            aria-hidden
          />
        );
      })}
    </span>
  );
}

function SentimentBar({ score }: { score: number }) {
  const pct = scoreToPercent(score);
  return (
    <div className="space-y-1.5">
      <div className="relative h-3 w-full overflow-hidden rounded-full border bg-muted">
        <div
          className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500"
          aria-hidden
        />
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Rất tiêu cực</span>
        <span>Trung tính</span>
        <span>Rất tích cực</span>
      </div>
    </div>
  );
}

function ResponseCard({
  responseKey,
  text,
  disabled,
}: {
  responseKey: ResponseKey;
  text: string;
  disabled: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const meta = RESPONSE_META[responseKey];

  async function handleCopy(): Promise<void> {
    if (disabled) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.clipboard !== "undefined"
      ) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        return;
      }
      throw new Error("clipboard not available");
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  }

  const tone =
    responseKey === "empathetic"
      ? "border-rose-200/70 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30"
      : responseKey === "professional"
        ? "border-sky-200/70 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/30"
        : "border-amber-200/70 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30";

  const toneLabel =
    responseKey === "empathetic"
      ? "text-rose-700 dark:text-rose-400"
      : responseKey === "professional"
        ? "text-sky-700 dark:text-sky-400"
        : "text-amber-700 dark:text-amber-400";

  return (
    <div
      className={`relative flex h-full flex-col rounded-xl border p-4 shadow-sm ${tone}`}
    >
      <header className="mb-2 space-y-0.5">
        <div
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${toneLabel}`}
        >
          <MessageCircleHeart className="size-3" />
          {meta.title}
        </div>
        <p className="text-[11px] text-muted-foreground">{meta.subtitle}</p>
      </header>
      <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {text}
      </p>
      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
        <span className="text-[11px] text-muted-foreground">
          {text.length} ký tự
        </span>
        <div className="relative">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={disabled}
          >
            <ClipboardCopy className="size-3.5" />
            Sao chép
          </Button>
          {copied ? (
            <span
              className="pointer-events-none absolute -top-7 right-0 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white shadow"
              role="status"
            >
              Đã chép
            </span>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

export function ReviewResponderForm() {
  const [state, formAction, pending] = useActionState<
    ReviewResponderState,
    FormData
  >(generateReviewResponderAction, INITIAL_REVIEW_RESPONDER_STATE);
  const lastErrorRef = useRef<string | null>(null);
  const [reviewLen, setReviewLen] = useState<number>(
    state.values.reviewText.length,
  );
  const [previewRating, setPreviewRating] = useState<number>(
    state.values.rating,
  );

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
    setReviewLen(state.values.reviewText.length);
    setPreviewRating(state.values.rating);
  }, [state.values.reviewText, state.values.rating]);

  const result = state.result;
  const hasResult = result !== null;

  function handleExport(): void {
    const md = buildMarkdown(state);
    if (!md) return;
    try {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `review-responder-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Markdown.");
    } catch {
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  }

  function handlePrint(): void {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5 print:hidden">
        <div className="space-y-2">
          <Label htmlFor="rr-review" className="text-sm font-medium">
            Nội dung đánh giá khách hàng{" "}
            <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="rr-review"
            name="reviewText"
            defaultValue={state.values.reviewText}
            placeholder="Dán nguyên văn nội dung đánh giá của khách (ví dụ: 'Cà phê ngon nhưng nhân viên hơi chậm khi quán đông, mong cải thiện...')"
            disabled={pending}
            minLength={REVIEW_TEXT_MIN}
            maxLength={REVIEW_TEXT_MAX}
            rows={5}
            required
            onChange={(e) => setReviewLen(e.currentTarget.value.length)}
            className={TEXTAREA_CLASS}
          />
          <p className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Tối thiểu {REVIEW_TEXT_MIN}, tối đa {REVIEW_TEXT_MAX} ký tự.
            </span>
            <span
              className={
                reviewLen < REVIEW_TEXT_MIN || reviewLen > REVIEW_TEXT_MAX
                  ? "font-semibold text-destructive"
                  : ""
              }
            >
              {reviewLen}/{REVIEW_TEXT_MAX}
            </span>
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset className="space-y-2" disabled={pending}>
            <legend className="text-sm font-medium">
              Số sao đánh giá <span className="text-destructive">*</span>
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {RATING_OPTIONS.map((n) => {
                const checked = previewRating === n;
                return (
                  <label
                    key={n}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      defaultChecked={state.values.rating === n}
                      onChange={() => setPreviewRating(n)}
                      className="sr-only"
                      required
                    />
                    <StarRow value={n} size="sm" />
                    <span className="font-semibold">{n}</span>
                  </label>
                );
              })}
            </div>
            <div className="pt-1">
              <StarRow value={previewRating} size="lg" />
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="rr-customer" className="text-sm font-medium">
              Tên khách hàng (tuỳ chọn)
            </Label>
            <Input
              id="rr-customer"
              name="customerName"
              type="text"
              defaultValue={state.values.customerName}
              placeholder="ví dụ: Chị Lan, Anh Minh"
              maxLength={CUSTOMER_NAME_MAX}
              disabled={pending}
            />
            <p className="text-[11px] text-muted-foreground">
              Tối đa {CUSTOMER_NAME_MAX} ký tự. Để trống nếu ẩn danh.
            </p>
          </div>
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">
            Nền tảng đánh giá <span className="text-destructive">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
              >
                <input
                  type="radio"
                  name="platform"
                  value={opt.value}
                  defaultChecked={state.values.platform === opt.value}
                  className="sr-only"
                  required
                />
                <Store className="size-3.5" />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">
            Ngôn ngữ phản hồi <span className="text-destructive">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
              >
                <input
                  type="radio"
                  name="language"
                  value={opt.value}
                  defaultChecked={state.values.language === opt.value}
                  className="sr-only"
                  required
                />
                <Languages className="size-3.5" />
                {opt.label}
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
              ? "Đang tạo..."
              : hasResult
                ? "Tạo lại phản hồi"
                : "Phân tích & soạn phản hồi"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground print:hidden">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phân tích đánh giá và soạn phản hồi...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              Kết quả do AI tạo
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                In
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="size-4" />
                Tải markdown
              </Button>
            </div>
          </div>

          <article className="space-y-5 rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-6">
            <header className="space-y-3 border-b pb-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  <Store className="size-3" />
                  {platformLabelFor(state.values.platform)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  <StarRow value={state.values.rating} size="sm" />
                  {state.values.rating}/5
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  <Languages className="size-3" />
                  {languageLabelFor(state.values.language)}
                </span>
                {state.values.customerName.trim().length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                    {state.values.customerName.trim()}
                  </span>
                ) : null}
              </div>
              <blockquote className="rounded-xl border border-border/70 bg-muted/40 p-3 text-sm italic leading-relaxed text-foreground">
                &ldquo;{state.values.reviewText.trim()}&rdquo;
              </blockquote>
            </header>

            <div className="rounded-xl border bg-background/60 p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Gauge className="size-3" />
                  Phân tích cảm xúc
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    <Smile className="size-3" />
                    {SENTIMENT_LABEL_VI[result.sentiment.label]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                    Điểm: {result.sentiment.score.toFixed(2)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                    Độ tự tin:{" "}
                    {(result.sentiment.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <SentimentBar score={result.sentiment.score} />

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-rose-200/70 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/30">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="size-3" />
                    Vấn đề chính
                  </div>
                  {result.detectedIssues.length > 0 ? (
                    <ul className="space-y-1.5">
                      {result.detectedIssues.map((s, i) => (
                        <li
                          key={`issue-${i}`}
                          className="flex gap-2 text-sm leading-relaxed text-foreground"
                        >
                          <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-rose-500" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Không phát hiện vấn đề rõ rệt trong đánh giá này.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    <ListChecks className="size-3" />
                    Hành động đề xuất cho đội ngũ
                  </div>
                  <ul className="space-y-1.5">
                    {result.suggestedActions.map((s, i) => (
                      <li
                        key={`act-${i}`}
                        className="flex gap-2 text-sm leading-relaxed text-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Heart className="size-3" />
                3 biến thể phản hồi gợi ý
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {RESPONSE_KEYS.map((key) => (
                  <ResponseCard
                    key={key}
                    responseKey={key}
                    text={result.responses[key]}
                    disabled={pending}
                  />
                ))}
              </div>
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
