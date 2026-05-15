import type {
  MenuIdea,
  MenuIdeaFlavor,
  MenuIdeaSeason,
} from "@/lib/xai";

export const MENU_IDEA_SEASONS: ReadonlyArray<{
  value: MenuIdeaSeason;
  label: string;
}> = [
  { value: "spring", label: "Xuân" },
  { value: "summer", label: "Hạ" },
  { value: "autumn", label: "Thu" },
  { value: "winter", label: "Đông" },
];

export const MENU_IDEA_FLAVORS: ReadonlyArray<{
  value: MenuIdeaFlavor;
  label: string;
}> = [
  { value: "coffee", label: "Cà phê đậm" },
  { value: "milk", label: "Sữa nhẹ" },
  { value: "fruit", label: "Trái cây" },
  { value: "tea", label: "Trà" },
  { value: "creative", label: "Sáng tạo" },
];

export type MenuIdeasState = {
  season: MenuIdeaSeason;
  flavor: MenuIdeaFlavor;
  ideas: MenuIdea[] | null;
  error: string | null;
  generatedAt: number | null;
};

export const INITIAL_MENU_IDEAS_STATE: MenuIdeasState = {
  season: "summer",
  flavor: "coffee",
  ideas: null,
  error: null,
  generatedAt: null,
};

export function isMenuIdeaSeason(v: unknown): v is MenuIdeaSeason {
  return (
    typeof v === "string" &&
    MENU_IDEA_SEASONS.some((s) => s.value === v)
  );
}

export function isMenuIdeaFlavor(v: unknown): v is MenuIdeaFlavor {
  return (
    typeof v === "string" &&
    MENU_IDEA_FLAVORS.some((f) => f.value === v)
  );
}
