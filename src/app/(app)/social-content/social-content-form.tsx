"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Check,
  Copy,
  Download,
  Loader2,
  Megaphone,
  RefreshCw,
  ThumbsUp,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateSocialContentAction } from "./generate-action";
import {
  INITIAL_SOCIAL_CONTENT_STATE,
  type SocialContentState,
} from "./social-content-types";
import type { SocialContentTone } from "@/lib/xai";

type PlatformKey = "instagram" | "tiktok" | "facebook";

type PlatformSpec = {
  key: PlatformKey;
  label: string;
  hint: string;
  target: number;
  hardMax: number;
  Icon: typeof Camera;
  iconClass: string;
};

const PLATFORMS: ReadonlyArray<PlatformSpec> = [
  {
    key: "instagram",
    label: "Instagram caption",
    hint: "≤ 220 ký tự, 3-5 hashtag ở cuối",
    target: 220,
    hardMax: 280,
    Icon: Camera,
    iconClass: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    key: "tiktok",
    label: "TikTok hook",
    hint: "1 câu giật mình, ≤ 100 ký tự",
    target: 100,
    hardMax: 120,
    Icon: Video,
    iconClass:
      "bg-zinc-900/10 text-zinc-900 dark:bg-zinc-50/15 dark:text-zinc-100",
  },
  {
    key: "facebook",
    label: "Facebook post",
    hint: "1 đoạn thân thiện, ≤ 400 ký tự",
    target: 400,
    hardMax: 480,
    Icon: ThumbsUp,
    iconClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
];

type ToneOption = {
  value: SocialContentTone;
  label: string;
  desc: string;
};

const TONE_OPTIONS: ReadonlyArray<ToneOption> = [
  { value: "playful", label: "Vui vẻ", desc: "Hài hước, thân thiện" },
  { value: "premium", label: "Sang trọng", desc: "Tinh tế, đẳng cấp" },
  { value: "youthful", label: "Trẻ trung", desc: "Hợp Gen Z, năng động" },
];

function counterClass(len: number, target: number, hardMax: number): string {
  if (len > hardMax) return "bg-destructive/15 text-destructive";
  if (len > target) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  }
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
}

function buildMarkdown(
  topic: string,
  tone: SocialContentTone,
  ig: string,
  tt: string,
  fb: string,
): string {
  const toneLabel =
    TONE_OPTIONS.find((t) => t.value === tone)?.label ?? tone;
  return (
    `# Nội dung social\n\n` +
    `- Chủ đề: ${topic}\n` +
    `- Tông giọng: ${toneLabel}\n\n` +
    `## Instagram caption\n\n${ig}\n\n` +
    `## TikTok hook\n\n${tt}\n\n` +
    `## Facebook post\n\n${fb}\n`
  );
}

export function SocialContentForm() {
  const [state, formAction, pending] = useActionState<
    SocialContentState,
    FormData
  >(generateSocialContentAction, INITIAL_SOCIAL_CONTENT_STATE);

  const [topic, setTopic] = useState<string>(
    INITIAL_SOCIAL_CONTENT_STATE.topic,
  );
  const [tone, setTone] = useState<SocialContentTone>(
    INITIAL_SOCIAL_CONTENT_STATE.tone,
  );
  const [copiedKey, setCopiedKey] = useState<PlatformKey | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.result !== null) {
      setTopic(state.topic);
      setTone(state.tone);
    }
  }, [state.result, state.topic, state.tone]);

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
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async (
    key: PlatformKey,
    text: string,
    label: string,
  ) => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Clipboard API không khả dụng");
      }
      setCopiedKey(key);
      toast.success(`Đã sao chép ${label}`);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      toast.error("Không thể sao chép. Vui lòng thử thủ công.");
    }
  };

  const handleDownloadMarkdown = () => {
    if (!state.result) return;
    const md = buildMarkdown(
      state.topic,
      state.tone,
      state.result.instagram,
      state.result.tiktok,
      state.result.facebook,
    );
    try {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `social-content-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file markdown");
    } catch {
      toast.error("Không tải được file markdown");
    }
  };

  const result = state.result;
  const hasResult = result !== null;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="social-topic" className="text-sm font-medium">
            Chủ đề <span className="text-destructive">*</span>
          </Label>
          <Input
            id="social-topic"
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="ví dụ: Khai trương món bạc xỉu dừa mới"
            disabled={pending}
            maxLength={200}
            required
            minLength={5}
          />
          <p className="text-[11px] text-muted-foreground">
            {topic.length}/200 ký tự (tối thiểu 5)
          </p>
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-sm font-medium">Tông giọng</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TONE_OPTIONS.map((opt) => {
              const active = tone === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "cursor-pointer rounded-md border p-3 text-sm transition-colors " +
                    (active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                      : "border-input hover:bg-accent/40")
                  }
                >
                  <input
                    type="radio"
                    name="tone"
                    value={opt.value}
                    checked={active}
                    onChange={() => setTone(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {opt.desc}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={pending || topic.trim().length < 5}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RefreshCw className="size-4" />
            ) : (
              <Megaphone className="size-4" />
            )}
            {pending
              ? "Đang tạo..."
              : hasResult
                ? "Tạo lại nội dung"
                : "Tạo nội dung"}
          </Button>
        </div>
      </form>

      {pending && !hasResult ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang viết bộ nội dung 3 nền tảng cho quán bạn...
        </div>
      ) : null}

      {hasResult && result ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Megaphone className="size-3" />
              Nội dung đã tạo
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadMarkdown}
            >
              <Download className="size-4" />
              Tải markdown
            </Button>
          </div>

          <ul className="space-y-3">
            {PLATFORMS.map((p) => {
              const value: string =
                p.key === "instagram"
                  ? result.instagram
                  : p.key === "tiktok"
                    ? result.tiktok
                    : result.facebook;
              const len = value.length;
              const isCopied = copiedKey === p.key;
              const Icon = p.Icon;

              return (
                <li
                  key={p.key}
                  className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span
                        className={
                          "flex size-9 items-center justify-center rounded-lg " +
                          p.iconClass
                        }
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-semibold leading-tight">
                          {p.label}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {p.hint}
                        </p>
                      </div>
                    </div>
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums " +
                        counterClass(len, p.target, p.hardMax)
                      }
                    >
                      {len} / {p.target} ký tự
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap rounded-md border bg-background px-3 py-2 text-sm leading-relaxed">
                    {value}
                  </p>

                  <div className="flex items-center justify-end border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={isCopied ? "secondary" : "outline"}
                      onClick={() => handleCopy(p.key, value, p.label)}
                    >
                      {isCopied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {isCopied ? "Đã chép" : "Sao chép"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
