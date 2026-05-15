import type { PodcastScriptData } from "@/lib/xai";

export type PodcastDuration = "5-min" | "10-min" | "20-min";
export type PodcastStyle = "interview" | "monologue" | "story-driven";

export const PODCAST_DURATIONS: ReadonlyArray<{
  value: PodcastDuration;
  label: string;
  hint: string;
}> = [
  { value: "5-min", label: "5 phút", hint: "Tập ngắn ~200 từ/phần" },
  { value: "10-min", label: "10 phút", hint: "Tập vừa ~400 từ/phần" },
  { value: "20-min", label: "20 phút", hint: "Tập dài ~700 từ/phần" },
];

export const PODCAST_STYLES: ReadonlyArray<{
  value: PodcastStyle;
  label: string;
  hint: string;
}> = [
  { value: "interview", label: "Phỏng vấn", hint: "Hỏi đáp, có chiều sâu" },
  { value: "monologue", label: "Monologue", hint: "Host độc thoại, gần gũi" },
  {
    value: "story-driven",
    label: "Kể chuyện",
    hint: "Có nhân vật, cao trào",
  },
];

export type PodcastScriptFormState = {
  topic: string;
  duration: PodcastDuration;
  style: PodcastStyle;
  hostName: string;
  data: PodcastScriptData | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_PODCAST_SCRIPT_STATE: PodcastScriptFormState = {
  topic: "",
  duration: "10-min",
  style: "monologue",
  hostName: "",
  data: null,
  error: null,
  generatedAt: null,
};

export function isPodcastDuration(v: unknown): v is PodcastDuration {
  return (
    typeof v === "string" &&
    PODCAST_DURATIONS.some((d) => d.value === v)
  );
}

export function isPodcastStyle(v: unknown): v is PodcastStyle {
  return (
    typeof v === "string" && PODCAST_STYLES.some((s) => s.value === v)
  );
}

export function podcastDurationLabel(v: PodcastDuration): string {
  return PODCAST_DURATIONS.find((d) => d.value === v)?.label ?? v;
}

export function podcastStyleLabel(v: PodcastStyle): string {
  return PODCAST_STYLES.find((s) => s.value === v)?.label ?? v;
}
