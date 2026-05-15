export const PWA_ICON_STYLE_OPTIONS = [
  { value: "modern", label: "Modern — hiện đại, tối giản" },
  { value: "vintage", label: "Vintage — cổ điển, hoài niệm" },
  { value: "playful", label: "Playful — vui tươi, trẻ trung" },
  { value: "luxe", label: "Luxe — sang trọng, cao cấp" },
] as const;

export const PWA_ICON_STYLE_VALUES: ReadonlyArray<string> =
  PWA_ICON_STYLE_OPTIONS.map((o) => o.value);

export type PwaIconStyleValue =
  (typeof PWA_ICON_STYLE_OPTIONS)[number]["value"];

export type PwaIconState = {
  initial: string;
  style: string;
  backgroundColor: string;
  imageUrl: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_PWA_ICON_STATE: PwaIconState = {
  initial: "C",
  style: "modern",
  backgroundColor: "#6f4e37",
  imageUrl: null,
  error: null,
  generatedAt: null,
};

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
