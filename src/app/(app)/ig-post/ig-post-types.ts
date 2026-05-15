export const VIBE_OPTIONS = [
  { value: "cozy", label: "Cozy — ấm cúng" },
  { value: "vibrant", label: "Vibrant — rực rỡ" },
  { value: "minimal", label: "Minimal — tối giản" },
  { value: "nostalgic", label: "Nostalgic — hoài niệm" },
] as const;

export const VIBE_VALUES = VIBE_OPTIONS.map((o) => o.value);

export type VibeValue = (typeof VIBE_OPTIONS)[number]["value"];

export const TOPIC_MIN = 5;
export const TOPIC_MAX = 200;
export const OVERLAY_MAX = 80;
export const DEFAULT_ACCENT = "#d97706";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(s: string): boolean {
  return HEX_RE.test(s);
}

export type IgPostState = {
  topic: string;
  vibe: string;
  accent: string;
  overlay: string;
  imageUrl: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_IG_POST_STATE: IgPostState = {
  topic: "",
  vibe: "cozy",
  accent: DEFAULT_ACCENT,
  overlay: "",
  imageUrl: null,
  error: null,
  generatedAt: null,
};
