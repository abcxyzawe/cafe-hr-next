"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCopy,
  CloudSun,
  Loader2,
  Megaphone,
  Newspaper,
  Printer,
  Quote,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { generateNewsletterAction } from "./generate-action";
import {
  HIGHLIGHTS_MAX,
  INITIAL_NEWSLETTER_STATE,
  LENGTH_OPTIONS,
  TONE_OPTIONS,
  type NewsletterState,
} from "./types";
import type { WeeklyNewsletterResult } from "@/lib/xai";

const TEXTAREA_CLASS =
  "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mdInlineToHtml(s: string): string {
  // Escape first, then apply a small whitelist of inline markdown.
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return out;
}

function mdBodyToHtml(body: string): string {
  const lines = body.split(/\r?\n/);
  const parts: string[] = [];
  let inList = false;
  let buffer: string[] = [];

  const flushParagraph = (): void => {
    if (buffer.length === 0) return;
    const text = buffer.join(" ").trim();
    if (text.length > 0) {
      parts.push(`<p style="margin:0 0 10px 0;line-height:1.6;">${mdInlineToHtml(text)}</p>`);
    }
    buffer = [];
  };
  const closeList = (): void => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flushParagraph();
      closeList();
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (!inList) {
        parts.push('<ul style="margin:0 0 10px 18px;padding:0;line-height:1.6;">');
        inList = true;
      }
      const item = line.replace(/^[-*]\s+/, "");
      parts.push(`<li>${mdInlineToHtml(item)}</li>`);
      continue;
    }
    closeList();
    buffer.push(line);
  }
  flushParagraph();
  closeList();
  return parts.join("\n");
}

function buildHtml(state: NewsletterState, result: WeeklyNewsletterResult): string {
  const tone =
    TONE_OPTIONS.find((o) => o.value === state.values.tone)?.label ??
    state.values.tone;
  const length =
    LENGTH_OPTIONS.find((o) => o.value === state.values.length)?.label ??
    state.values.length;

  const head =
    `<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"/>` +
    `<title>${escapeHtml(result.title)}</title></head>` +
    `<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#0f172a;">`;

  const sectionsHtml = result.sections
    .map(
      (sec) =>
        `<section style="margin:0 0 18px 0;">` +
        `<h2 style="margin:0 0 8px 0;font-size:18px;color:#4338ca;">${escapeHtml(sec.heading)}</h2>` +
        `<div style="font-size:14px;color:#1f2937;">${mdBodyToHtml(sec.body)}</div>` +
        `</section>`,
    )
    .join("\n");

  const quoteHtml = result.quote
    ? `<section style="margin:0 0 18px 0;padding:12px 16px;border-left:4px solid #8b5cf6;background:#f5f3ff;border-radius:6px;">` +
      `<h2 style="margin:0 0 6px 0;font-size:16px;color:#6d28d9;">Câu trích dẫn</h2>` +
      `<blockquote style="margin:0;font-style:italic;color:#1f2937;">&ldquo;${escapeHtml(result.quote.text)}&rdquo;</blockquote>` +
      `<p style="margin:6px 0 0 0;font-size:13px;color:#475569;">— ${escapeHtml(result.quote.author)}</p>` +
      `</section>`
    : "";

  const weatherHtml = result.weather
    ? `<p style="margin:0 0 14px 0;padding:10px 14px;background:#ecfeff;border-radius:6px;font-size:13px;color:#155e75;">` +
      `🌤️ ${escapeHtml(result.weather)}</p>`
    : "";

  const card =
    `<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;box-shadow:0 4px 18px rgba(15,23,42,0.06);">` +
    `<div style="font-size:11px;color:#64748b;margin-bottom:6px;">Tuần kết thúc ${escapeHtml(state.values.weekEndingIso)} · ${escapeHtml(tone)} · ${escapeHtml(length)}</div>` +
    `<h1 style="margin:0 0 14px 0;font-size:26px;line-height:1.2;color:#1e1b4b;">${escapeHtml(result.emoji)} ${escapeHtml(result.title)}</h1>` +
    `<p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">${escapeHtml(result.greeting)}</p>` +
    weatherHtml +
    sectionsHtml +
    quoteHtml +
    `<p style="margin:18px 0 6px 0;font-size:15px;color:#334155;line-height:1.6;">${escapeHtml(result.closing)}</p>` +
    `<p style="margin:0;font-size:14px;color:#6d28d9;font-weight:600;">${escapeHtml(result.signature)}</p>` +
    `<p style="margin:14px 0 0 0;font-size:11px;color:#94a3b8;text-align:right;">Khoảng ${result.wordCount} từ</p>` +
    `</div>`;

  return `${head}${card}</body></html>`;
}

function buildMarkdown(state: NewsletterState, result: WeeklyNewsletterResult): string {
  const tone =
    TONE_OPTIONS.find((o) => o.value === state.values.tone)?.label ??
    state.values.tone;
  const length =
    LENGTH_OPTIONS.find((o) => o.value === state.values.length)?.label ??
    state.values.length;

  const lines: string[] = [];
  lines.push(`# ${result.emoji} ${result.title}`);
  lines.push("");
  lines.push(
    `_Tuần kết thúc ${state.values.weekEndingIso} · Văn phong: ${tone} · Độ dài: ${length}_`,
  );
  lines.push("");
  lines.push(result.greeting);
  lines.push("");
  if (result.weather) {
    lines.push(`> 🌤️ ${result.weather}`);
    lines.push("");
  }
  for (const sec of result.sections) {
    lines.push(`## ${sec.heading}`);
    lines.push("");
    lines.push(sec.body);
    lines.push("");
  }
  if (result.quote) {
    lines.push(`## Câu trích dẫn`);
    lines.push("");
    lines.push(`> "${result.quote.text}"`);
    lines.push(`> — ${result.quote.author}`);
    lines.push("");
  }
  lines.push(result.closing);
  lines.push("");
  lines.push(`**${result.signature}**`);
  lines.push("");
  lines.push(`_Khoảng ${result.wordCount} từ._`);
  lines.push("");
  return lines.join("\n");
}

async function writeToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to manual fallback
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<
    NewsletterState,
    FormData
  >(generateNewsletterAction, INITIAL_NEWSLETTER_STATE);
  const lastErrorRef = useRef<string | null>(null);
  const [highlightsLen, setHighlightsLen] = useState<number>(
    state.values.highlights.length,
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
    setHighlightsLen(state.values.highlights.length);
  }, [state.values.highlights]);

  const result = state.result;
  const hasResult = result !== null;

  const html = useMemo<string>(
    () => (result ? buildHtml(state, result) : ""),
    [state, result],
  );
  const markdown = useMemo<string>(
    () => (result ? buildMarkdown(state, result) : ""),
    [state, result],
  );

  const handleCopyHtml = useCallback(async (): Promise<void> => {
    if (!html) return;
    try {
      await writeToClipboard(html);
      toast.success("Đã sao chép HTML.");
    } catch {
      toast.error("Không thể sao chép HTML.");
    }
  }, [html]);

  const handleCopyMd = useCallback(async (): Promise<void> => {
    if (!markdown) return;
    try {
      await writeToClipboard(markdown);
      toast.success("Đã sao chép Markdown.");
    } catch {
      toast.error("Không thể sao chép Markdown.");
    }
  }, [markdown]);

  function handlePrint(): void {
    if (typeof window === "undefined") return;
    window.print();
  }

  // SAFE: html is produced by buildHtml() above which calls escapeHtml() on
  // every user-controlled or model-controlled string before interpolation,
  // and only emits a small whitelist of inline markdown (**, *, -) converted
  // after escaping. No raw user input reaches this sink.
  const previewHtml: { __html: string } = { __html: html };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5 print:hidden">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nl-week" className="text-sm font-medium">
              Tuần kết thúc <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nl-week"
              name="weekEndingIso"
              type="date"
              defaultValue={state.values.weekEndingIso}
              disabled={pending}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Chọn ngày Chủ nhật (hoặc ngày cuối tuần làm việc).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nl-tone" className="text-sm font-medium">
              Văn phong <span className="text-destructive">*</span>
            </Label>
            <Select
              id="nl-tone"
              name="tone"
              defaultValue={state.values.tone}
              disabled={pending}
              required
            >
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nl-length" className="text-sm font-medium">
              Độ dài <span className="text-destructive">*</span>
            </Label>
            <Select
              id="nl-length"
              name="length"
              defaultValue={state.values.length}
              disabled={pending}
              required
            >
              {LENGTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium">Tuỳ chọn</span>
            <div className="flex flex-col gap-2 rounded-md border border-input bg-background/40 px-3 py-2">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <CloudSun className="size-4 text-sky-500" />
                  Nhắc thời tiết tuần
                </span>
                <input
                  type="checkbox"
                  name="includeWeather"
                  defaultChecked={state.values.includeWeather}
                  disabled={pending}
                  className="size-4 rounded border-input accent-indigo-600"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Quote className="size-4 text-violet-500" />
                  Câu trích dẫn truyền cảm hứng
                </span>
                <input
                  type="checkbox"
                  name="includeQuote"
                  defaultChecked={state.values.includeQuote}
                  disabled={pending}
                  className="size-4 rounded border-input accent-indigo-600"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nl-highlights" className="text-sm font-medium">
            Điểm nhấn (tuỳ chọn)
          </Label>
          <textarea
            id="nl-highlights"
            name="highlights"
            defaultValue={state.values.highlights}
            placeholder={
              "Mỗi dòng một ý, ví dụ:\n" +
              "- Doanh thu tuần tăng 12%\n" +
              "- Bạn Lan đạt barista của tháng\n" +
              "- Ra mắt menu cà phê lạnh mùa hè"
            }
            disabled={pending}
            maxLength={HIGHLIGHTS_MAX}
            rows={4}
            onChange={(e) => setHighlightsLen(e.currentTarget.value.length)}
            className={TEXTAREA_CLASS}
          />
          <p className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Tuỳ chọn. AI sẽ đan các điểm nhấn vào các phần phù hợp.
            </span>
            <span
              className={
                highlightsLen > HIGHLIGHTS_MAX
                  ? "font-semibold text-destructive"
                  : ""
              }
            >
              {highlightsLen}/{HIGHLIGHTS_MAX}
            </span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={pending}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang soạn..."
              : hasResult
                ? "Tạo lại"
                : "Tạo bản tin"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground print:hidden">
          <Loader2 className="size-4 animate-spin text-indigo-500" />
          AI đang soạn bản tin tuần cho đội ngũ...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              <Newspaper className="size-3" />
              Bản tin do AI tạo
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyHtml}
              >
                <ClipboardCopy className="size-4" />
                Sao chép HTML
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyMd}
              >
                <ClipboardCopy className="size-4" />
                Sao chép Markdown
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                In
              </Button>
            </div>
          </div>

          <article className="space-y-5 rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-6">
            <header className="space-y-2 border-b pb-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  Tuần kết thúc {state.values.weekEndingIso}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  {TONE_OPTIONS.find((o) => o.value === state.values.tone)
                    ?.label ?? state.values.tone}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  {LENGTH_OPTIONS.find((o) => o.value === state.values.length)
                    ?.label ?? state.values.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  ~{result.wordCount} từ
                </span>
              </div>
              <h2 className="text-2xl font-semibold leading-tight">
                <span className="mr-1">{result.emoji}</span>
                {result.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {result.greeting}
              </p>
            </header>

            {result.weather ? (
              <div className="rounded-xl border border-sky-200/70 bg-sky-50/60 p-3 text-sm dark:border-sky-900/60 dark:bg-sky-950/30">
                <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                  <CloudSun className="size-3" />
                  Thời tiết tuần
                </div>
                <p className="leading-relaxed text-foreground">
                  {result.weather}
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {result.sections.map((sec, i) => (
                <section key={`sec-${i}`} className="space-y-2">
                  <h3 className="inline-flex items-center gap-2 text-base font-semibold text-indigo-700 dark:text-indigo-300">
                    <Megaphone className="size-4" />
                    {sec.heading}
                  </h3>
                  <div
                    className="rounded-xl border bg-background/60 p-3 text-sm leading-relaxed text-foreground sm:p-4"
                    // SAFE: mdBodyToHtml escapes every interpolation before
                    // applying the whitelist of inline markdown.
                    dangerouslySetInnerHTML={{ __html: mdBodyToHtml(sec.body) }}
                  />
                </section>
              ))}
            </div>

            {result.quote ? (
              <section className="space-y-2">
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-violet-700 dark:text-violet-300">
                  <Quote className="size-4" />
                  Câu trích dẫn
                </h3>
                <blockquote className="rounded-xl border border-violet-200/70 bg-violet-50/60 p-4 text-sm italic leading-relaxed text-foreground dark:border-violet-900/60 dark:bg-violet-950/30">
                  &ldquo;{result.quote.text}&rdquo;
                  <footer className="mt-2 not-italic text-xs text-muted-foreground">
                    — {result.quote.author}
                  </footer>
                </blockquote>
              </section>
            ) : null}

            <footer className="space-y-2 border-t pt-3">
              <p className="text-sm leading-relaxed text-foreground">
                {result.closing}
              </p>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                {result.signature}
              </p>
            </footer>
          </article>

          <details className="rounded-xl border bg-card/40 p-3 print:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
              Xem trước email-style HTML
            </summary>
            <div
              className="mt-3 max-h-[600px] overflow-auto rounded-md border bg-white p-3 text-black shadow-inner"
              dangerouslySetInnerHTML={previewHtml}
            />
          </details>
        </section>
      ) : null}
    </div>
  );
}
