import type { WeeklyMenuDay } from "@/lib/xai";

export type MenuWeekSeason = "spring" | "summer" | "autumn" | "winter";
export type MenuWeekFocus =
  | "coffee"
  | "milk"
  | "tea"
  | "vietnamese"
  | "creative";

export const MENU_WEEK_SEASONS: ReadonlyArray<{
  value: MenuWeekSeason;
  label: string;
}> = [
  { value: "spring", label: "Xuân" },
  { value: "summer", label: "Hạ" },
  { value: "autumn", label: "Thu" },
  { value: "winter", label: "Đông" },
];

export const MENU_WEEK_FOCUSES: ReadonlyArray<{
  value: MenuWeekFocus;
  label: string;
}> = [
  { value: "coffee", label: "Cà phê" },
  { value: "milk", label: "Sữa" },
  { value: "tea", label: "Trà" },
  { value: "vietnamese", label: "Đặc sản Việt Nam" },
  { value: "creative", label: "Sáng tạo" },
];

export type MenuWeekState = {
  season: MenuWeekSeason;
  focus: MenuWeekFocus;
  days: WeeklyMenuDay[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_MENU_WEEK_STATE: MenuWeekState = {
  season: "summer",
  focus: "coffee",
  days: null,
  error: null,
  generatedAt: null,
};

export function isMenuWeekSeason(v: unknown): v is MenuWeekSeason {
  return (
    typeof v === "string" && MENU_WEEK_SEASONS.some((s) => s.value === v)
  );
}

export function isMenuWeekFocus(v: unknown): v is MenuWeekFocus {
  return (
    typeof v === "string" && MENU_WEEK_FOCUSES.some((f) => f.value === v)
  );
}

export function menuWeekSeasonLabel(v: MenuWeekSeason): string {
  return MENU_WEEK_SEASONS.find((s) => s.value === v)?.label ?? v;
}

export function menuWeekFocusLabel(v: MenuWeekFocus): string {
  return MENU_WEEK_FOCUSES.find((f) => f.value === v)?.label ?? v;
}
