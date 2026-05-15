import type { SeasonalDecorResult } from "@/lib/xai";

export const SEASON_OPTIONS = [
  { value: "xuan", label: "Xuân" },
  { value: "ha", label: "Hạ" },
  { value: "thu", label: "Thu" },
  { value: "dong", label: "Đông" },
] as const;

export const HOLIDAY_OPTIONS = [
  { value: "tet", label: "Tết Nguyên Đán" },
  { value: "mid-autumn", label: "Trung Thu" },
  { value: "christmas", label: "Giáng Sinh" },
  { value: "valentines", label: "Valentine" },
  { value: "black-friday", label: "Black Friday" },
  { value: "no-holiday", label: "Không có lễ hội" },
] as const;

export const SEASON_VALUES: ReadonlyArray<string> = SEASON_OPTIONS.map(
  (o) => o.value,
);
export const HOLIDAY_VALUES: ReadonlyArray<string> = HOLIDAY_OPTIONS.map(
  (o) => o.value,
);

export type SeasonValue = (typeof SEASON_OPTIONS)[number]["value"];
export type HolidayValue = (typeof HOLIDAY_OPTIONS)[number]["value"];

export const PLACEMENT_LABELS: Record<string, string> = {
  "entrance archway and door area": "Cổng vào / cửa chính",
  "interior accent wall": "Mảng tường nhấn",
  "table-top centerpiece arrangement": "Trang trí trên bàn",
  "window display facing street": "Cửa sổ hướng phố",
};

export const PLACEMENT_COUNT = 4;

export type SeasonalDecorState = {
  season: string;
  holiday: string;
  result: SeasonalDecorResult | null;
  requested: number;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_SEASONAL_DECOR_STATE: SeasonalDecorState = {
  season: "xuan",
  holiday: "tet",
  result: null,
  requested: PLACEMENT_COUNT,
  error: null,
  generatedAt: null,
};
