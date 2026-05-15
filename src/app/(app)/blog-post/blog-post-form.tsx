"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlogPostData } from "@/lib/xai";
import { generateBlogPostAction } from "./generate-action";
import {
  BLOG_POST_AUDIENCES,
  BLOG_POST_LENGTHS,
  INITIAL_BLOG_POST_STATE,
  type BlogPostAudience,
  type BlogPostFormState,
  type BlogPostLength,
} from "./blog-post-types";

async function writeToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
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
}

function slugForFilename(s: string): string {
  const base = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "bai-blog";
}

function renderBlogPostMarkdown(data: BlogPostData): string {
  const parts: string[] = [];
  parts.push(`# ${data.title}`);
  parts.push("");
  parts.push(data.intro);
  for (const sec of data.sections) {
    parts.push("");
    parts.push(`## ${sec.heading}`);
    parts.push("");
    parts.push(sec.body);
  }
  if (data.cta) {
    parts.push("");
    parts.push(`> ${data.cta}`);
  }
  if (data.tags.length > 0) {
    parts.push("");
    parts.push(data.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" "));
  }
  return parts.join("\n");
}

function paragraphsOf(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function BlogPostForm() {
  const [state, formAction, pending] = useActionState<
    BlogPostFormState,
    FormData
  >(generateBlogPostAction, INITIAL_BLOG_POST_STATE);

  const [topic, setTopic] = useState<string>(INITIAL_BLOG_POST_STATE.topic);
  const [audience, setAudience] = useState<BlogPostAudience>(
    INITIAL_BLOG_POST_STATE.audience,
  );
  const [length, setLength] = useState<BlogPostLength>(
    INITIAL_BLOG_POST_STATE.length,
  );
  const [includeCta, setIncludeCta] = useState<boolean>(
    INITIAL_BLOG_POST_STATE.includeCta,
  );

  const [copied, setCopied] = useState<boolean>(false);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.data !== null) {
      setTopic(state.topic);
      setAudience(state.audience);
      setLength(state.length);
      setIncludeCta(state.includeCta);
    }
  }, [
    state.data,
    state.topic,
    state.audience,
    state.length,
    state.includeCta,
  ]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const markdown = useMemo<string>(
    () => (state.data ? renderBlogPostMarkdown(state.data) : ""),
    [state.data],
  );

  const handleCopy = useCallback(async () => {
    if (!markdown) return;
    await writeToClipboard(markdown);
    setCopied(true);
    toast.success("Đã sao chép Markdown");
    window.setTimeout(() => setCopied(false), 1500);
  }, [markdown]);

  const handleDownload = useCallback(() => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugForFilename(state.data?.title ?? state.topic ?? "bai-blog")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdown, state.data, state.topic]);

  const hasResult = state.data !== null;

  return (
    <div className="space-y-6">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="blog-topic">Chủ đề bài blog</Label>
          <Input
            id="blog-topic"
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="VD: Cách chọn hạt cà phê arabica chất lượng"
            minLength={5}
            maxLength={200}
            required
            disabled={pending}
            autoComplete="off"
          />
          <p className="text-[11px] text-muted-foreground">
            5-200 ký tự. Nên nêu rõ góc nhìn (so sánh, hướng dẫn, kinh nghiệm…).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Đối tượng độc giả</Label>
          <div
            role="radiogroup"
            aria-label="Đối tượng độc giả"
            className="grid grid-cols-2 gap-2"
          >
            {BLOG_POST_AUDIENCES.map((opt) => {
              const selected = audience === opt.value;
              return (
                <label
                  key={opt.value}
                  title={opt.hint}
                  className={
                    "flex cursor-pointer flex-col items-start justify-center rounded-md border px-3 py-2 text-xs font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="audience"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setAudience(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                  <span
                    className={
                      "mt-0.5 text-[10px] font-normal " +
                      (selected ? "opacity-90" : "text-muted-foreground")
                    }
                  >
                    {opt.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Độ dài bài viết</Label>
          <div
            role="radiogroup"
            aria-label="Độ dài bài viết"
            className="grid grid-cols-3 gap-2"
          >
            {BLOG_POST_LENGTHS.map((opt) => {
              const selected = length === opt.value;
              return (
                <label
                  key={opt.value}
                  title={opt.hint}
                  className={
                    "flex cursor-pointer flex-col items-center justify-center rounded-md border px-3 py-2 text-xs font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="length"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setLength(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                  <span
                    className={
                      "mt-0.5 text-[10px] font-normal " +
                      (selected ? "opacity-90" : "text-muted-foreground")
                    }
                  >
                    {opt.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border bg-card/40 px-3 py-2 sm:col-span-2">
          <div className="min-w-0">
            <Label
              htmlFor="blog-include-cta"
              className="cursor-pointer text-sm font-medium"
            >
              Bao gồm đoạn kêu gọi hành động (CTA)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Nếu bật, AI sẽ thêm 1-2 câu mời độc giả ghé quán/đặt bàn/thử món.
            </p>
          </div>
          <button
            type="button"
            id="blog-include-cta"
            role="switch"
            aria-checked={includeCta}
            onClick={() => setIncludeCta((v) => !v)}
            disabled={pending}
            className={
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 " +
              (includeCta ? "bg-primary" : "bg-input")
            }
          >
            <span
              className={
                "inline-block size-5 transform rounded-full bg-background shadow-sm transition-transform " +
                (includeCta ? "translate-x-5" : "translate-x-0.5")
              }
            />
          </button>
          {/* Hidden input ensures form submission carries the boolean value. */}
          <input
            type="hidden"
            name="includeCta"
            value={includeCta ? "on" : "off"}
          />
        </div>

        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang viết..."
              : hasResult
                ? "Tạo lại bài viết"
                : "Tạo bài viết"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang soạn bài blog cho bạn...
        </div>
      ) : null}

      {hasResult && state.data ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <FileText className="size-3" />
              Bài blog đã sẵn sàng
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Đã sao chép" : "Sao chép Markdown"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleDownload}
              >
                <Download className="size-4" />
                Tải .md
              </Button>
            </div>
          </div>

          <article className="space-y-5 rounded-lg border bg-card/40 p-5 sm:p-6">
            <header className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {state.data.title}
              </h1>
              <p className="text-base leading-relaxed text-foreground/90">
                {state.data.intro}
              </p>
            </header>

            <div className="space-y-5">
              {state.data.sections.map((sec, i) => (
                <section key={i} className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {sec.heading}
                  </h2>
                  {paragraphsOf(sec.body).map((p, j) => (
                    <p
                      key={j}
                      className="text-sm leading-relaxed text-foreground/90 sm:text-base"
                    >
                      {p}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            {state.data.cta ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Kêu gọi hành động
                </span>
                {state.data.cta}
              </div>
            ) : null}

            {state.data.tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Tag className="size-3.5 text-muted-foreground" />
                {state.data.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full border border-input bg-background px-2.5 py-0.5 text-xs font-medium text-foreground/80"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      ) : null}
    </div>
  );
}
