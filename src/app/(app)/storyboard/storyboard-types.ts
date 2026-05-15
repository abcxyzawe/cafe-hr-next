import type { StoryboardData } from "@/lib/xai";

export type StoryboardDuration = "15-sec" | "30-sec" | "60-sec";
export type StoryboardStyle =
  | "storytelling"
  | "product-focus"
  | "behind-the-scenes"
  | "customer-testimonial";

export const STORYBOARD_DURATIONS: ReadonlyArray<{
  value: StoryboardDuration;
  label: string;
  hint: string;
}> = [
  { value: "15-sec", label: "15 giây", hint: "TikTok/Reels ngắn" },
  { value: "30-sec", label: "30 giây", hint: "Cân bằng, phổ biến" },
  { value: "60-sec", label: "60 giây", hint: "Có chiều sâu hơn" },
];

export const STORYBOARD_STYLES: ReadonlyArray<{
  value: StoryboardStyle;
  label: string;
  hint: string;
}> = [
  {
    value: "storytelling",
    label: "Kể chuyện",
    hint: "Có cảm xúc, dẫn dắt",
  },
  {
    value: "product-focus",
    label: "Tập trung sản phẩm",
    hint: "Cận cảnh đồ uống",
  },
  {
    value: "behind-the-scenes",
    label: "Hậu trường",
    hint: "Pha chế, không khí quán",
  },
  {
    value: "customer-testimonial",
    label: "Khách chia sẻ",
    hint: "Phản hồi thật của khách",
  },
];

export type StoryboardFormState = {
  concept: string;
  duration: StoryboardDuration;
  style: StoryboardStyle;
  data: StoryboardData | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_STORYBOARD_STATE: StoryboardFormState = {
  concept: "",
  duration: "30-sec",
  style: "storytelling",
  data: null,
  error: null,
  generatedAt: null,
};

export function isStoryboardDuration(v: unknown): v is StoryboardDuration {
  return (
    typeof v === "string" &&
    STORYBOARD_DURATIONS.some((d) => d.value === v)
  );
}

export function isStoryboardStyle(v: unknown): v is StoryboardStyle {
  return (
    typeof v === "string" && STORYBOARD_STYLES.some((s) => s.value === v)
  );
}

export function storyboardDurationLabel(v: StoryboardDuration): string {
  return STORYBOARD_DURATIONS.find((d) => d.value === v)?.label ?? v;
}

export function storyboardStyleLabel(v: StoryboardStyle): string {
  return STORYBOARD_STYLES.find((s) => s.value === v)?.label ?? v;
}
