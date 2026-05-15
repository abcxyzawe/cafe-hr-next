export const STYLE_OPTIONS = [
  { value: "modern", label: "Modern — hiện đại" },
  { value: "vibrant", label: "Vibrant — rực rỡ" },
  { value: "minimalist", label: "Minimalist — tối giản" },
  { value: "luxury", label: "Luxury — sang trọng" },
] as const;

export const STYLE_VALUES = STYLE_OPTIONS.map((o) => o.value);
export type StyleValue = (typeof STYLE_OPTIONS)[number]["value"];

export const PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google Ads" },
  { value: "instagram", label: "Instagram" },
] as const;

export const PLATFORM_VALUES = PLATFORM_OPTIONS.map((o) => o.value);
export type PlatformValue = (typeof PLATFORM_OPTIONS)[number]["value"];

export const THEME_MIN = 5;
export const THEME_MAX = 200;
export const OFFER_MAX = 50;

export type AdBannerState = {
  theme: string;
  offer: string;
  style: string;
  platform: string;
  imageUrl: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_AD_BANNER_STATE: AdBannerState = {
  theme: "",
  offer: "",
  style: "modern",
  platform: "facebook",
  imageUrl: null,
  error: null,
  generatedAt: null,
};
