export const STYLE_OPTIONS = [
  { value: "vintage", label: "Vintage — hoài cổ" },
  { value: "modern", label: "Modern — hiện đại" },
  { value: "playful", label: "Playful — vui nhộn" },
  { value: "luxury", label: "Luxury — sang trọng" },
  { value: "minimalist", label: "Minimalist — tối giản" },
] as const;

export const COLOR_MOOD_OPTIONS = [
  { value: "warm", label: "Warm — ấm" },
  { value: "cool", label: "Cool — lạnh" },
  { value: "vibrant", label: "Vibrant — rực rỡ" },
  { value: "mono", label: "Mono — đơn sắc" },
] as const;

export const STYLE_VALUES = STYLE_OPTIONS.map((o) => o.value);
export const COLOR_MOOD_VALUES = COLOR_MOOD_OPTIONS.map((o) => o.value);

export type StyleValue = (typeof STYLE_OPTIONS)[number]["value"];
export type ColorMoodValue = (typeof COLOR_MOOD_OPTIONS)[number]["value"];

export const HEADLINE_MAX = 40;
export const TOPIC_MIN = 5;
export const TOPIC_MAX = 200;

export type PosterState = {
  topic: string;
  style: string;
  colorMood: string;
  headline: string;
  imageUrl: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_POSTER_STATE: PosterState = {
  topic: "",
  style: "modern",
  colorMood: "warm",
  headline: "",
  imageUrl: null,
  error: null,
  generatedAt: null,
};
