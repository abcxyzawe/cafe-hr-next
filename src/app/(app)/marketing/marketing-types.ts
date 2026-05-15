import type { MarketingCopy, MarketingTone } from "@/lib/xai";

export type MarketingFormValues = {
  topic: string;
  tone: MarketingTone;
  offer: string;
};

export type MarketingState = {
  values: MarketingFormValues;
  result: MarketingCopy | null;
  error: string | null;
};

export const MARKETING_TONES: ReadonlyArray<{
  value: MarketingTone;
  label: string;
  hint: string;
}> = [
  {
    value: "playful",
    label: "Vui vẻ",
    hint: "Hài hước, năng động, gần gũi như bạn thân",
  },
  {
    value: "premium",
    label: "Sang trọng",
    hint: "Tinh tế, lịch lãm, thiên về cảm xúc và chất lượng",
  },
  {
    value: "youthful",
    label: "Trẻ trung",
    hint: "Bắt trend, dùng emoji, ngôn ngữ Gen Z",
  },
] as const;

export const MARKETING_TONE_VALUES = MARKETING_TONES.map((t) => t.value);

export function isMarketingTone(v: string): v is MarketingTone {
  return (MARKETING_TONE_VALUES as readonly string[]).includes(v);
}

export const TOPIC_MIN = 3;
export const TOPIC_MAX = 200;
export const OFFER_MIN = 1;
export const OFFER_MAX = 200;

export const INITIAL_MARKETING_STATE: MarketingState = {
  values: {
    topic: "",
    tone: "playful",
    offer: "",
  },
  result: null,
  error: null,
};
