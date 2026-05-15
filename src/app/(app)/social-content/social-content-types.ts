import type {
  SocialContentResult,
  SocialContentTone,
} from "@/lib/xai";

export type SocialContentState = {
  topic: string;
  tone: SocialContentTone;
  result: SocialContentResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_SOCIAL_CONTENT_STATE: SocialContentState = {
  topic: "",
  tone: "playful",
  result: null,
  error: null,
  generatedAt: null,
};

export const SOCIAL_TONE_VALUES: ReadonlyArray<SocialContentTone> = [
  "playful",
  "premium",
  "youthful",
];

export function isSocialTone(value: string): value is SocialContentTone {
  return (SOCIAL_TONE_VALUES as ReadonlyArray<string>).includes(value);
}
