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
  Clapperboard,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateStoryboardAction } from "./generate-action";
import {
  INITIAL_STORYBOARD_STATE,
  STORYBOARD_DURATIONS,
  STORYBOARD_STYLES,
  storyboardDurationLabel,
  storyboardStyleLabel,
  type StoryboardDuration,
  type StoryboardFormState,
  type StoryboardStyle,
} from "./storyboard-types";

function buildMarkdown(state: StoryboardFormState): string {
  const data = state.data;
  if (!data) return "";
  const lines: string[] = [];
  lines.push(`# Storyboard: ${state.concept}`);
  lines.push("");
  lines.push(
    `_${storyboardDurationLabel(state.duration)} · ${storyboardStyleLabel(
      state.style,
    )} · Tổng ${data.totalSec}s_`,
  );
  lines.push("");
  data.frames.forEach((f) => {
    lines.push(`## Khung ${f.number} — ${f.durationSec}s`);
    lines.push("");
    lines.push(`**Cảnh quay:** ${f.shot}`);
    lines.push("");
    lines.push(`**Voiceover:** "${f.voiceover}"`);
    lines.push("");
  });
  lines.push(`---`);
  lines.push(`Tổng thời lượng: **${data.totalSec} giây**`);
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

export function StoryboardForm() {
  const [state, formAction, pending] = useActionState<
    StoryboardFormState,
    FormData
  >(generateStoryboardAction, INITIAL_STORYBOARD_STATE);

  const [concept, setConcept] = useState<string>(
    INITIAL_STORYBOARD_STATE.concept,
  );
  const [duration, setDuration] = useState<StoryboardDuration>(
    INITIAL_STORYBOARD_STATE.duration,
  );
  const [style, setStyle] = useState<StoryboardStyle>(
    INITIAL_STORYBOARD_STATE.style,
  );
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.data !== null) {
      setConcept(state.concept);
      setDuration(state.duration);
      setStyle(state.style);
    }
  }, [state.data, state.concept, state.duration, state.style]);

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

  const handleDownload = useCallback(() => {
    if (!hasResult) return;
    const md = buildMarkdown(state);
    const stamp = new Date().toISOString().slice(0, 10);
    const slug =
      state.concept
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40) || "storyboard";
    downloadMarkdown(`storyboard-${slug}-${stamp}.md`, md);
    toast.success("Đã tải file Markdown");
  }, [hasResult, state]);

  const conceptLen = concept.trim().length;
  const conceptHint =
    conceptLen === 0
      ? "5-200 ký tự"
      : conceptLen < 5
        ? `Còn thiếu ${5 - conceptLen} ký tự`
        : conceptLen > 200
          ? `Vượt ${conceptLen - 200} ký tự`
          : `${conceptLen}/200 ký tự`;
  const conceptValid = conceptLen >= 5 && conceptLen <= 200;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="storyboard-concept" className="text-sm font-medium">
            Ý tưởng / concept video
          </Label>
          <Input
            id="storyboard-concept"
            name="concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="VD: Khai trương món bạc xỉu mùa thu"
            disabled={pending}
            maxLength={250}
            autoComplete="off"
            aria-invalid={conceptLen > 0 && !conceptValid}
          />
          <p
            className={
              "text-[11px] " +
              (conceptLen > 0 && !conceptValid
                ? "text-destructive"
                : "text-muted-foreground")
            }
          >
            {conceptHint}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Thời lượng</Label>
          <div
            role="radiogroup"
            aria-label="Thời lượng"
            className="grid grid-cols-3 gap-2"
          >
            {STORYBOARD_DURATIONS.map((opt) => {
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
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {STORYBOARD_STYLES.map((opt) => {
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasResult ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={pending}
            >
              <Download className="size-4" />
              Tải .md
            </Button>
          ) : null}
          <Button type="submit" disabled={pending || !conceptValid}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending
              ? "Đang phác thảo..."
              : hasResult
                ? "Tạo lại storyboard"
                : "Tạo storyboard"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang phác thảo 6 khung hình storyboard...
        </div>
      ) : null}

      {hasResult && data ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Clapperboard className="size-3" />
              {storyboardDurationLabel(state.duration)} ·{" "}
              {storyboardStyleLabel(state.style)}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
              <Clock className="size-3" />
              Tổng {data.totalSec} giây · {data.frames.length} khung
            </span>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.frames.map((frame) => (
              <li
                key={frame.number}
                className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm"
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {frame.number}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground/80">
                    <Clock className="size-3" />
                    {frame.durationSec}s
                  </span>
                </header>
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cảnh quay
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {frame.shot}
                  </p>
                </div>
                <div className="rounded-md border-l-2 border-primary/60 bg-primary/5 px-3 py-2">
                  <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Voiceover
                  </div>
                  <p className="text-sm italic leading-relaxed text-foreground/90">
                    &ldquo;{frame.voiceover}&rdquo;
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border-2 border-dashed border-primary/40 bg-accent/30 p-4 text-sm shadow-sm">
            <span className="font-semibold text-primary">Tổng thời lượng:</span>{" "}
            <span className="tabular-nums">{data.totalSec} giây</span> ·{" "}
            <span className="text-muted-foreground">
              mục tiêu {storyboardDurationLabel(state.duration)}
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
