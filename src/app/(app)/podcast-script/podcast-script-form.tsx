"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Download,
  Loader2,
  Mic,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePodcastScriptAction } from "./generate-action";
import {
  INITIAL_PODCAST_SCRIPT_STATE,
  PODCAST_DURATIONS,
  PODCAST_STYLES,
  podcastDurationLabel,
  podcastStyleLabel,
  type PodcastDuration,
  type PodcastScriptFormState,
  type PodcastStyle,
} from "./podcast-script-types";

function buildFullText(state: PodcastScriptFormState): string {
  const data = state.data;
  if (!data) return "";
  const lines: string[] = [];
  lines.push(`# Kịch bản podcast: ${state.topic}`);
  lines.push("");
  lines.push(
    `_${podcastDurationLabel(state.duration)} · ${podcastStyleLabel(
      state.style,
    )}${state.hostName ? ` · Host: ${state.hostName}` : ""}_`,
  );
  lines.push("");
  lines.push("## Intro");
  lines.push("");
  lines.push(data.intro);
  lines.push("");
  data.segments.forEach((seg, idx) => {
    lines.push(`## Segment ${idx + 1}: ${seg.title}`);
    lines.push("");
    lines.push(seg.body);
    lines.push("");
  });
  lines.push("## Outro");
  lines.push("");
  lines.push(data.outro);
  lines.push("");
  return lines.join("\n");
}

function buildPlainText(state: PodcastScriptFormState): string {
  const data = state.data;
  if (!data) return "";
  const lines: string[] = [];
  lines.push(`Kịch bản podcast: ${state.topic}`);
  lines.push(
    `${podcastDurationLabel(state.duration)} · ${podcastStyleLabel(
      state.style,
    )}${state.hostName ? ` · Host: ${state.hostName}` : ""}`,
  );
  lines.push("");
  lines.push("INTRO");
  lines.push(data.intro);
  lines.push("");
  data.segments.forEach((seg, idx) => {
    lines.push(`SEGMENT ${idx + 1}: ${seg.title.toUpperCase()}`);
    lines.push(seg.body);
    lines.push("");
  });
  lines.push("OUTRO");
  lines.push(data.outro);
  return lines.join("\n");
}

function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy fallback.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function PodcastScriptForm() {
  const [state, formAction, pending] = useActionState<
    PodcastScriptFormState,
    FormData
  >(generatePodcastScriptAction, INITIAL_PODCAST_SCRIPT_STATE);

  const [topic, setTopic] = useState<string>(INITIAL_PODCAST_SCRIPT_STATE.topic);
  const [duration, setDuration] = useState<PodcastDuration>(
    INITIAL_PODCAST_SCRIPT_STATE.duration,
  );
  const [style, setStyle] = useState<PodcastStyle>(
    INITIAL_PODCAST_SCRIPT_STATE.style,
  );
  const [hostName, setHostName] = useState<string>(
    INITIAL_PODCAST_SCRIPT_STATE.hostName,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.data !== null) {
      setTopic(state.topic);
      setDuration(state.duration);
      setStyle(state.style);
      setHostName(state.hostName);
    }
  }, [state.data, state.topic, state.duration, state.style, state.hostName]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  const data = state.data;
  const hasResult = data !== null;

  const handleCopy = useCallback(async () => {
    if (!hasResult) return;
    const ok = await copyToClipboard(buildPlainText(state));
    if (ok) toast.success("Đã sao chép kịch bản");
    else toast.error("Không sao chép được. Hãy thử thủ công.");
  }, [hasResult, state]);

  const handleDownload = useCallback(() => {
    if (!hasResult) return;
    const md = buildFullText(state);
    const stamp = new Date().toISOString().slice(0, 10);
    const slug =
      state.topic
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40) || "podcast";
    downloadMarkdown(`podcast-${slug}-${stamp}.md`, md);
    toast.success("Đã tải file Markdown");
  }, [hasResult, state]);

  const topicLen = topic.trim().length;
  const topicHint =
    topicLen === 0
      ? "5-200 ký tự"
      : topicLen < 5
        ? `Còn thiếu ${5 - topicLen} ký tự`
        : topicLen > 200
          ? `Vượt ${topicLen - 200} ký tự`
          : `${topicLen}/200 ký tự`;
  const topicValid = topicLen >= 5 && topicLen <= 200;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="podcast-topic" className="text-sm font-medium">
            Chủ đề tập podcast
          </Label>
          <Input
            id="podcast-topic"
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="VD: Hành trình một hạt cà phê Robusta Việt Nam"
            disabled={pending}
            maxLength={250}
            autoComplete="off"
            aria-invalid={topicLen > 0 && !topicValid}
          />
          <p
            className={
              "text-[11px] " +
              (topicLen > 0 && !topicValid
                ? "text-destructive"
                : "text-muted-foreground")
            }
          >
            {topicHint}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Thời lượng</Label>
          <div
            role="radiogroup"
            aria-label="Thời lượng"
            className="grid grid-cols-3 gap-2"
          >
            {PODCAST_DURATIONS.map((opt) => {
              const selected = duration === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="duration"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setDuration(opt.value)}
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

        <div className="space-y-2">
          <Label className="text-sm font-medium">Phong cách</Label>
          <div
            role="radiogroup"
            aria-label="Phong cách"
            className="grid grid-cols-3 gap-2"
          >
            {PODCAST_STYLES.map((opt) => {
              const selected = style === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <input
                    type="radio"
                    name="style"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setStyle(opt.value)}
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

        <div className="space-y-2">
          <Label htmlFor="podcast-host" className="text-sm font-medium">
            Tên host (tùy chọn)
          </Label>
          <Input
            id="podcast-host"
            name="hostName"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="VD: Minh Cà Phê"
            disabled={pending}
            maxLength={60}
            autoComplete="off"
          />
          <p className="text-[11px] text-muted-foreground">
            Tối đa 60 ký tự. Để trống nếu không có tên cụ thể.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasResult ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={pending}
              >
                <ClipboardCopy className="size-4" />
                Sao chép
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={pending}
              >
                <Download className="size-4" />
                Tải .md
              </Button>
            </>
          ) : null}
          <Button type="submit" disabled={pending || !topicValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang viết ~30s..."
              : hasResult
                ? "Tạo lại kịch bản"
                : "Tạo kịch bản"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang viết kịch bản podcast (~30 giây)...
        </div>
      ) : null}

      {hasResult && data ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Mic className="size-3" />
              {podcastDurationLabel(state.duration)} ·{" "}
              {podcastStyleLabel(state.style)}
              {state.hostName ? ` · Host: ${state.hostName}` : ""}
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {data.segments.length} segment
            </span>
          </div>

          <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 shadow-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Intro · Hook ~30 giây
            </div>
            <p className="text-base leading-relaxed text-foreground/90">
              {data.intro}
            </p>
          </div>

          <ul className="grid gap-4">
            {data.segments.map((seg, idx) => (
              <li
                key={`${seg.title}-${idx}`}
                className="flex flex-col gap-3 rounded-lg border bg-card/60 p-5 shadow-sm"
              >
                <header className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Segment {idx + 1}
                    </div>
                    <h3 className="text-xl font-semibold leading-snug">
                      {seg.title}
                    </h3>
                  </div>
                </header>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {seg.body}
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border-2 border-dashed border-primary/40 bg-accent/30 p-4 shadow-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Outro · CTA
            </div>
            <p className="text-base italic leading-relaxed text-foreground/90">
              {data.outro}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
