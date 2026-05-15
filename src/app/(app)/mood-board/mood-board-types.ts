import type { MoodBoardResult } from "@/lib/xai";

export const THEME_OPTIONS = [
  {
    value: "cozy-rustic",
    label: "Cozy Rustic — ấm cúng, mộc mạc",
    prompt: "cozy rustic",
  },
  {
    value: "minimalist-zen",
    label: "Minimalist Zen — tối giản, tĩnh tại",
    prompt: "minimalist zen",
  },
  {
    value: "industrial-loft",
    label: "Industrial Loft — công nghiệp, loft",
    prompt: "industrial loft",
  },
  {
    value: "vintage-french",
    label: "Vintage French — cổ điển Pháp",
    prompt: "vintage french",
  },
  {
    value: "modern-bright",
    label: "Modern Bright — hiện đại, tươi sáng",
    prompt: "modern bright",
  },
  {
    value: "wabi-sabi",
    label: "Wabi-Sabi — không hoàn hảo, tự nhiên",
    prompt: "wabi-sabi",
  },
] as const;

export const THEME_VALUES: ReadonlyArray<string> = THEME_OPTIONS.map(
  (o) => o.value,
);

export type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

export const VARIANT_LABELS: Record<string, string> = {
  "cafe interior close-up detail": "Chi tiết nội thất",
  "table-top still life": "Tĩnh vật trên bàn",
  "overhead flat-lay arrangement": "Góc nhìn từ trên",
  "window light atmospheric scene": "Ánh sáng cửa sổ",
};

export type MoodBoardState = {
  theme: string;
  keywordsRaw: string;
  result: MoodBoardResult | null;
  requested: number;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_MOOD_BOARD_STATE: MoodBoardState = {
  theme: "cozy-rustic",
  keywordsRaw: "",
  result: null,
  requested: 4,
  error: null,
  generatedAt: null,
};

export function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}
