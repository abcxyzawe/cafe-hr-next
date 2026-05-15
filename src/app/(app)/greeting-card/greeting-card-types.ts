export const OCCASION_OPTIONS = [
  { value: "tet", label: "Tết Nguyên Đán" },
  { value: "mid-autumn", label: "Trung Thu" },
  { value: "christmas", label: "Giáng Sinh" },
  { value: "valentines", label: "Valentine" },
  { value: "new-year", label: "Năm Mới" },
  { value: "birthday", label: "Sinh Nhật" },
  { value: "general-thanks", label: "Cảm Ơn" },
] as const;

export const TONE_OPTIONS = [
  { value: "warm", label: "Ấm áp" },
  { value: "formal", label: "Trang trọng" },
  { value: "playful", label: "Vui tươi" },
] as const;

export const OCCASION_VALUES = OCCASION_OPTIONS.map((o) => o.value);
export const TONE_VALUES = TONE_OPTIONS.map((o) => o.value);

export type OccasionValue = (typeof OCCASION_OPTIONS)[number]["value"];
export type ToneValue = (typeof TONE_OPTIONS)[number]["value"];

export const RECIPIENT_MIN = 2;
export const RECIPIENT_MAX = 60;

export type GreetingCardState = {
  occasion: string;
  recipientName: string;
  tone: string;
  message: string | null;
  imageUrl: string | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_GREETING_CARD_STATE: GreetingCardState = {
  occasion: "tet",
  recipientName: "",
  tone: "warm",
  message: null,
  imageUrl: null,
  error: null,
  generatedAt: null,
};
