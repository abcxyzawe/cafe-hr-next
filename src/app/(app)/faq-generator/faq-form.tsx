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
  ChevronDown,
  Copy,
  Download,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateFaqAction } from "./generate-action";
import {
  FAQ_FORMALITIES,
  FAQ_TOPIC_MAX,
  FAQ_TOPIC_MIN,
  INITIAL_FAQ_STATE,
  type FaqGeneratorState,
} from "./faq-types";
import type { FaqFormality, FaqItem } from "@/lib/xai";

function buildMarkdown(topic: string, items: FaqItem[]): string {
  const safeTopic = topic.trim() || "FAQ";
  const lines: string[] = [`# FAQ: ${safeTopic}`, ""];
  items.forEach((it, i) => {
    lines.push(`## ${i + 1}. ${it.question}`);
    lines.push("");
    lines.push(it.answer);
    lines.push("");
  });
  return lines.join("\n");
}

function buildPlainText(topic: string, items: FaqItem[]): string {
  const safeTopic = topic.trim() || "FAQ";
  const blocks: string[] = [`FAQ: ${safeTopic}`, ""];
  items.forEach((it, i) => {
    blocks.push(`${i + 1}. ${it.question}`);
    blocks.push(`   ${it.answer}`);
    blocks.push("");
  });
  return blocks.join("\n");
}

export function FaqForm() {
  const [state, formAction, pending] = useActionState<
    FaqGeneratorState,
    FormData
  >(generateFaqAction, INITIAL_FAQ_STATE);

  const [topic, setTopic] = useState<string>(INITIAL_FAQ_STATE.topic);
  const [formality, setFormality] = useState<FaqFormality>(
    INITIAL_FAQ_STATE.formality,
  );
  const lastErrorRef = useRef<string | null>(null);

  // Sync server-echoed values back after a successful submit
  useEffect(() => {
    if (state.items !== null) {
      if (state.topic !== topic) setTopic(state.topic);
      if (state.formality !== formality) setFormality(state.formality);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const charCount = topic.length;
  const tooShort = topic.trim().length < FAQ_TOPIC_MIN;
  const tooLong = charCount > FAQ_TOPIC_MAX;

  function handleTopicChange(e: ChangeEvent<HTMLInputElement>) {
    setTopic(e.target.value);
  }

  function handleFormalityChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v === "formal" || v === "friendly") {
      setFormality(v);
    }
  }

  async function handleCopyOne(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép vào clipboard");
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  async function handleCopyAll() {
    if (!state.items || state.items.length === 0) return;
    const text = buildPlainText(state.topic, state.items);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép toàn bộ FAQ vào clipboard");
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  function handleDownload() {
    if (!state.items || state.items.length === 0) return;
    const md = buildMarkdown(state.topic, state.items);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faq.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Đã tải file Markdown");
  }

  const items = state.items;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="faq-topic">Chủ đề FAQ</Label>
          <Input
            id="faq-topic"
            name="topic"
            value={topic}
            onChange={handleTopicChange}
            disabled={pending}
            minLength={FAQ_TOPIC_MIN}
            maxLength={FAQ_TOPIC_MAX}
            placeholder="vd: menu và giá cả, đặt bàn, phương thức thanh toán..."
            autoComplete="off"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <span className="text-muted-foreground">
              Mô tả ngắn gọn chủ đề mà bạn muốn AI tạo 10 câu hỏi thường gặp.
            </span>
            <span
              className={
                tooLong
                  ? "text-destructive"
                  : charCount > FAQ_TOPIC_MAX - 30
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }
            >
              {charCount}/{FAQ_TOPIC_MAX} ký tự
            </span>
          </div>
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium leading-none">Giọng văn</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FAQ_FORMALITIES.map((opt) => {
              const checked = formality === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 text-sm shadow-sm transition-colors hover:border-primary/50 " +
                    (checked
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-input")
                  }
                >
                  <input
                    type="radio"
                    name="formality"
                    value={opt.value}
                    checked={checked}
                    onChange={handleFormalityChange}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={pending || tooShort || tooLong}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <HelpCircle className="size-4" />
            )}
            {pending ? "Đang tạo..." : "Tạo 10 FAQ"}
          </Button>
        </div>
      </form>

      {pending && !items ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang viết 10 câu hỏi & trả lời cho bạn...
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <div className="space-y-3 rounded-md border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              {items.length} câu hỏi cho chủ đề "{state.topic}"
            </div>
          </div>

          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i}>
                <details className="group rounded-md border bg-background open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-snug">{it.question}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-2 border-t bg-muted/30 px-3 py-3">
                    <p className="text-sm leading-relaxed">{it.answer}</p>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopyOne(`${it.question}\n${it.answer}`)
                        }
                      >
                        <Copy className="size-3.5" />
                        Sao chép
                      </Button>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={pending}
            >
              <Download className="size-4" />
              Tải .md
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopyAll}
              disabled={pending}
            >
              <Copy className="size-4" />
              Sao chép tất cả
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
