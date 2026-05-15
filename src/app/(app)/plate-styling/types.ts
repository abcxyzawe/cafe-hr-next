export const PLATE_SHAPE_OPTIONS = [
  { value: "round", label: "Đĩa tròn — round" },
  { value: "square", label: "Đĩa vuông — square" },
  { value: "rectangular", label: "Đĩa chữ nhật — rectangular" },
  { value: "wooden-board", label: "Thớt/khay gỗ — wooden board" },
] as const;

export const PLATE_SHAPE_VALUES: ReadonlyArray<string> =
  PLATE_SHAPE_OPTIONS.map((o) => o.value);

export const MOOD_OPTIONS = [
  { value: "minimalist", label: "Minimalist — tối giản" },
  { value: "rustic-vietnamese", label: "Rustic Vietnamese — mộc Việt" },
  { value: "modern-fusion", label: "Modern Fusion — fusion hiện đại" },
  { value: "colorful-tropical", label: "Colorful Tropical — rực rỡ nhiệt đới" },
  { value: "fine-dining", label: "Fine Dining — sang trọng" },
] as const;

export const MOOD_VALUES: ReadonlyArray<string> = MOOD_OPTIONS.map(
  (o) => o.value,
);

export const BACKGROUND_OPTIONS = [
  { value: "marble", label: "Marble — đá cẩm thạch" },
  { value: "linen", label: "Linen — vải lanh" },
  { value: "dark-wood", label: "Dark wood — gỗ tối" },
  { value: "pastel", label: "Pastel — nền pastel" },
  { value: "parchment", label: "Parchment — giấy da" },
] as const;

export const BACKGROUND_VALUES: ReadonlyArray<string> = BACKGROUND_OPTIONS.map(
  (o) => o.value,
);

export const DISH_NAME_MIN = 3;
export const DISH_NAME_MAX = 80;
export const GARNISHES_MAX = 200;

export type PlateStylingResult = {
  imageBase64: string;
  prompt: string;
  revisedPrompt: string | null;
};

export type PlateStylingState = {
  dishName: string;
  plateShape: string;
  mood: string;
  background: string;
  garnishes: string;
  result: PlateStylingResult | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_PLATE_STYLING_STATE: PlateStylingState = {
  dishName: "",
  plateShape: "round",
  mood: "minimalist",
  background: "marble",
  garnishes: "",
  result: null,
  error: null,
  generatedAt: null,
};
